import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService, EmailProvider, EmailFolder } from '../common/prisma.service.js';
import { MessagesGateway } from '../messages/messages.gateway.js';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { join, extname } from 'path';
import { existsSync, mkdirSync, promises as fsPromises } from 'fs';

// Mail Service: Shared Group and Personal Inbox Management
@Injectable()
export class MailService implements OnModuleInit {
  private accountReauthNeeded = new Map<string, boolean>();
  private googleTokenExpiry = new Map<string, number>();

  // Injected Prisma Service and Messages Gateway
  private syncingAccounts = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway?: MessagesGateway,
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.emailAccount.updateMany({
        where: {
          isShared: true,
          allowedDomains: { equals: [] },
        },
        data: {
          allowedDomains: ['patterns247.net'],
        },
      });

      // Purge any duplicate messages in the system
      await this.purgeDuplicateMessages();

      // Purge stale non-domain emails from shared accounts
      const sharedAccs = await this.prisma.emailAccount.findMany({
        where: { isShared: true },
        select: { id: true, isShared: true, allowedDomains: true },
      });
      for (const sAcc of sharedAccs) {
        await this.purgeNonAllowedMessages(sAcc);
      }
    } catch (err: any) {
      console.warn('Init allowedDomains check:', err?.message || err);
    }
  }

  // Helper to remove any duplicate messages with identical (accountId, externalMessageId)
  async purgeDuplicateMessages(accountId?: string) {
    try {
      const allMsgs = await this.prisma.emailMessage.findMany({
        where: accountId ? { accountId } : {},
        select: { id: true, accountId: true, externalMessageId: true, receivedAt: true },
        orderBy: { receivedAt: 'desc' },
      });

      const seen = new Set<string>();
      const duplicateIds: string[] = [];

      for (const msg of allMsgs) {
        const key = `${msg.accountId}_${msg.externalMessageId}`;
        if (seen.has(key)) {
          duplicateIds.push(msg.id);
        } else {
          seen.add(key);
        }
      }

      if (duplicateIds.length > 0) {
        await this.prisma.emailMessage.deleteMany({
          where: { id: { in: duplicateIds } },
        });
      }
    } catch (err: any) {
      console.warn('purgeDuplicateMessages error:', err?.message || err);
    }
  }

  // Helper to purge non-allowed messages from a shared group account
  async purgeNonAllowedMessages(account: { id: string; isShared: boolean; allowedDomains?: string[] }) {
    try {
      if (!account.isShared || !account.allowedDomains || account.allowedDomains.length === 0) {
        return;
      }
      const cleanDomains = account.allowedDomains
        .map((d) => d.replace(/^@/, '').trim().toLowerCase())
        .filter(Boolean);
      if (cleanDomains.length === 0) return;

      const allMsgs = await this.prisma.emailMessage.findMany({
        where: { accountId: account.id },
        select: { id: true, fromAddress: true, toAddresses: true },
      });

      const toDeleteIds: string[] = [];
      for (const m of allMsgs) {
        if (!this.isEmailAllowed(m.fromAddress, m.toAddresses, cleanDomains)) {
          toDeleteIds.push(m.id);
        }
      }

      if (toDeleteIds.length > 0) {
        await this.prisma.emailMessage.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }
    } catch (err: any) {
      console.warn('purgeNonAllowedMessages error:', err?.message || err);
    }
  }

  // Helper: Verify if user is an ADMIN, OWNER, or Workspace Creator
  async verifyAdminOrOwnerRole(
    userId: string,
    workspaceId?: string,
    channelId?: string,
  ): Promise<boolean> {
    let targetWsId = workspaceId;
    if (!targetWsId && channelId) {
      const ch = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: { workspaceId: true },
      });
      if (ch) targetWsId = ch.workspaceId;
    }

    if (!targetWsId) return false;

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: targetWsId, userId } },
      include: { workspace: true },
    });

    if (!wsMember) return false;

    return (
      wsMember.role === 'ADMIN' ||
      wsMember.role === 'OWNER' ||
      wsMember.workspace?.ownerId === userId
    );
  }

  // Helper: validate whether current user has access to account (Direct Owner, Workspace Admin, or Channel Member)
  async validateAccountAccess(
    userId: string,
    accountId: string,
  ): Promise<{ account: any; isAdmin: boolean }> {
    const account = await this.prisma.emailAccount.findUnique({
      where: { id: accountId },
      include: {
        channel: {
          include: {
            workspace: { include: { members: true } },
            members: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!account) {
      throw new NotFoundException('Mailbox not found');
    }

    // Direct creator/owner has full access
    if (account.userId === userId) {
      return { account, isAdmin: true };
    }

    // If shared group mailbox:
    if (account.isShared) {
      // 1. Workspace Admin / Owner has full master access to all group inboxes
      const targetWsId = account.workspaceId || account.channel?.workspaceId;
      if (targetWsId) {
        const isAdmin = await this.verifyAdminOrOwnerRole(userId, targetWsId);
        if (isAdmin) {
          return { account, isAdmin: true };
        }
      }

      // 2. Channel member has access to read and participate in their group inbox
      if (account.channel?.members) {
        const isChannelMember = account.channel.members.some((m: any) => m.userId === userId);
        if (isChannelMember) {
          return { account, isAdmin: false };
        }
      }
    }

    throw new ForbiddenException('You do not have permission to access this group mailbox');
  }

  // List connected email accounts for user (personal + permitted group inboxes, with Admin Master view)
  async getAccounts(userId: string, workspaceId?: string) {
    let isAdmin = false;

    if (workspaceId) {
      const wsMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        include: { workspace: true },
      });
      if (
        wsMember &&
        (wsMember.role === 'ADMIN' ||
          wsMember.role === 'OWNER' ||
          wsMember.workspace.ownerId === userId)
      ) {
        isAdmin = true;
      }
    }

    let accounts: any[] = [];

    if (isAdmin && workspaceId) {
      // 👑 Workspace Admin / Owner sees:
      // 1. Their personal inboxes
      // 2. ALL shared group inboxes across the entire workspace (all 5 project groups!)
      accounts = await this.prisma.emailAccount.findMany({
        where: {
          OR: [
            { userId, isShared: false },
            { workspaceId, isShared: true },
          ],
        },
        include: {
          channel: { select: { id: true, name: true, isPrivate: true, createdById: true } },
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ isShared: 'asc' }, { createdAt: 'desc' }],
      });
    } else if (workspaceId) {
      // 👥 Regular Group Member sees:
      // 1. Their personal inboxes
      // 2. Only shared group inboxes for channels they belong to
      const userChannelMemberships = await this.prisma.channelMember.findMany({
        where: { userId, channel: { workspaceId } },
        select: { channelId: true },
      });
      const channelIds = userChannelMemberships.map((cm) => cm.channelId);

      accounts = await this.prisma.emailAccount.findMany({
        where: {
          OR: [
            { userId, isShared: false },
            {
              workspaceId,
              isShared: true,
              OR: [
                { channelId: { in: channelIds } },
                { userId }, // accounts they created
              ],
            },
          ],
        },
        include: {
          channel: { select: { id: true, name: true, isPrivate: true, createdById: true } },
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ isShared: 'asc' }, { createdAt: 'desc' }],
      });
    } else {
      // General fallback if no workspaceId provided
      accounts = await this.prisma.emailAccount.findMany({
        where: { userId },
        include: {
          channel: { select: { id: true, name: true, isPrivate: true, createdById: true } },
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (accounts.length === 0) return [];

    // Purge non-allowed domain messages and duplicates so counts are 100% accurate!
    for (const acc of accounts) {
      if (acc.isShared && acc.allowedDomains && acc.allowedDomains.length > 0) {
        await this.purgeNonAllowedMessages(acc);
      }
      await this.purgeDuplicateMessages(acc.id);
    }

    const accountIds = accounts.map((a) => a.id);

    // Group counts by accountId, folder, isRead, isStarred, isHandled
    const messageCounts = await this.prisma.emailMessage.groupBy({
      by: ['accountId', 'folder', 'isRead', 'isStarred', 'isHandled'],
      where: { accountId: { in: accountIds } },
      _count: { _all: true },
    });

    return accounts.map((acc) => {
      let inboxUnread = 0;
      let inboxTotal = 0;
      let starred = 0;
      let sent = 0;
      let drafts = 0;
      let trash = 0;
      let spam = 0;
      let unhandledCount = 0;
      let handledCount = 0;

      for (const row of messageCounts) {
        if (row.accountId === acc.id) {
          const count = row._count._all;
          if (row.isStarred) starred += count;
          if (row.folder === 'INBOX') {
            inboxTotal += count;
            if (!row.isRead) inboxUnread += count;
            if (!row.isHandled) unhandledCount += count;
            if (row.isHandled) handledCount += count;
          } else if (row.folder === 'SENT') {
            sent += count;
          } else if (row.folder === 'DRAFTS') {
            drafts += count;
          } else if (row.folder === 'TRASH') {
            trash += count;
          } else if (row.folder === 'SPAM') {
            if (!row.isRead) spam += count;
          }
        }
      }

      const isChannelShared = acc.isShared && acc.channel;
      const displayTitle = acc.displayName
        ? acc.displayName
        : isChannelShared
        ? `#${acc.channel.name} Group Inbox`
        : acc.emailAddress.split('@')[0];

      const isChannelAdmin =
        isAdmin ||
        acc.userId === userId ||
        (acc.channel && acc.channel.createdById === userId);

      return {
        id: acc.id,
        emailAddress: acc.emailAddress,
        displayName: displayTitle,
        provider: acc.provider,
        avatarUrl: acc.avatarUrl,
        isActive: acc.isActive,
        isShared: acc.isShared,
        allowedDomains: acc.allowedDomains || [],
        channelId: acc.channelId,
        channelName: acc.channel?.name || null,
        channelCreatedById: acc.channel?.createdById || null,
        isChannelAdmin,
        canManageGroupSync: isAdmin,
        workspaceId: acc.workspaceId,
        isAdminMaster: isAdmin && acc.isShared && acc.userId !== userId,
        ownerId: acc.userId,
        ownerName: acc.user?.name || 'Team Member',
        isOwner: acc.userId === userId,
        requiresReauth:
          acc.provider === EmailProvider.GOOGLE || acc.provider === EmailProvider.MICROSOFT
            ? (!acc.refreshToken || !!this.accountReauthNeeded.get(acc.id))
            : false,
        unreadCount: inboxUnread,
        unhandledCount,
        handledCount,
        inboxUnreadCount: inboxUnread,
        inboxTotalCount: inboxTotal,
        starredCount: starred,
        sentCount: sent,
        draftsCount: drafts,
        trashCount: trash,
        spamCount: spam,
        lastSyncedAt: acc.lastSyncedAt,
        createdAt: acc.createdAt,
      };
    });
  }

  // Generate Google OAuth 2.0 Consent URL for Connecting Mailbox (NO User Signup)
  async getGoogleAuthUrl(userId: string, redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy_google_client_id.apps.googleusercontent.com';
    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=google`;
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' ');

    const state = 'connect_mail';

    // Check if user already has an active refresh token
    const existing = await this.prisma.emailAccount.findFirst({
      where: { userId, provider: EmailProvider.GOOGLE, refreshToken: { not: null } },
    });

    // Always request consent so Google issues an offline refresh_token for background sync
    const promptParam = 'consent select_account';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId,
    )}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(
      scopes,
    )}&access_type=offline&prompt=${encodeURIComponent(promptParam)}&include_granted_scopes=true&state=${encodeURIComponent(state)}`;

    return { authUrl, url: authUrl, clientIdConfigured: !!process.env.GOOGLE_CLIENT_ID };
  }

  async handleGoogleCallback(
    userId: string,
    code: string,
    redirectUri?: string,
    emailAddressInput?: string,
    workspaceId?: string,
    channelId?: string,
    isShared?: boolean,
  ) {
    let emailAddress = emailAddressInput;
    let accessToken = 'oauth_access_token_demo';
    let refreshToken = 'oauth_refresh_token_demo';

    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=google`;

    // If real Google OAuth credentials configured, exchange authorization code
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirect,
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || refreshToken;

          // Fetch profile email
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const userData = await userRes.json();
          if (userData.email) {
            emailAddress = userData.email;
          }
        } else {
          console.error('Google token exchange error in mail service:', tokenData);
        }
      } catch (err) {
        console.warn('Google OAuth token exchange fallback:', err);
      }
    }

    if (!emailAddress) {
      emailAddress = emailAddressInput || 'user@patterns.com';
    }

    // Enforce role check: Only Admins/Owners (SuperAdmins) can connect a group/shared mailbox
    if (isShared || channelId) {
      const hasPermission = await this.verifyAdminOrOwnerRole(userId, workspaceId, channelId);
      if (!hasPermission) {
        throw new ForbiddenException(
          'Group mail sync can only be connected by Workspace Admins and Owners (SuperAdmins).'
        );
      }
    }

    // ONLY upsert EmailAccount linked to the active logged-in user - NO User signup/creation
    const account = await this.upsertAccountAndSeed(userId, {
      emailAddress,
      provider: EmailProvider.GOOGLE,
      displayName: emailAddress.split('@')[0],
      accessToken,
      refreshToken,
      workspaceId,
      channelId,
      isShared,
    });

    // Immediately sync real emails from user's live Gmail account
    try {
      await this.syncGmailAccount(account);
    } catch (syncErr) {
      console.warn('Initial Gmail sync failed:', syncErr);
    }

    return { success: true, emailAccount: account };
  }

  // Generate Microsoft 365 OAuth Consent URL for Connecting Mailbox (NO User Signup)
  async getMicrosoftAuthUrl(userId: string, redirectUri?: string) {
    const clientId = process.env.MICROSOFT_CLIENT_ID || 'dummy_ms_client_id';
    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=microsoft`;
    const scopes = ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'].join(' ');
    const state = 'connect_mail';

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
      clientId,
    )}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&scope=${encodeURIComponent(
      scopes,
    )}&state=${encodeURIComponent(state)}`;

    return { authUrl, url: authUrl, clientIdConfigured: !!process.env.MICROSOFT_CLIENT_ID };
  }

  // Handle Microsoft OAuth Callback & Link Mail Account to Current User
  async handleMicrosoftCallback(
    userId: string,
    code: string,
    redirectUri?: string,
    emailAddressInput?: string,
    workspaceId?: string,
    channelId?: string,
    isShared?: boolean,
  ) {
    let emailAddress = emailAddressInput;
    let accessToken = 'ms_graph_token';
    let refreshToken = 'ms_refresh_token';

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=microsoft`;

    if (clientId && clientSecret) {
      try {
        const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirect,
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || refreshToken;

          const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const profile = await profileRes.json();
          emailAddress = (profile.mail || profile.userPrincipalName || emailAddress).toLowerCase().trim();
        }
      } catch (err) {
        console.warn('Microsoft OAuth token exchange fallback:', err);
      }
    }

    if (!emailAddress) {
      emailAddress = emailAddressInput || 'team@outlook.com';
    }

    // Enforce role check: Only Admins/Owners (SuperAdmins) can connect a group/shared mailbox
    if (isShared || channelId) {
      const hasPermission = await this.verifyAdminOrOwnerRole(userId, workspaceId, channelId);
      if (!hasPermission) {
        throw new ForbiddenException(
          'Group mail sync can only be connected by Workspace Admins and Owners (SuperAdmins).'
        );
      }
    }

    const account = await this.upsertAccountAndSeed(userId, {
      emailAddress,
      provider: EmailProvider.MICROSOFT,
      displayName: emailAddress.split('@')[0],
      accessToken,
      refreshToken,
      workspaceId,
      channelId,
      isShared,
    });

    // Immediately sync real emails from user's live Microsoft 365 / Outlook account
    try {
      await this.syncMicrosoftAccount(account);
    } catch (syncErr) {
      console.warn('Initial Microsoft sync failed:', syncErr);
    }

    return { success: true, emailAccount: account };
  }

  // Connect Custom / Company Email (Google Workspace, M365, or Corporate Domain)
  async connectAccount(
    userId: string,
    data: {
      emailAddress: string;
      provider?: EmailProvider;
      displayName?: string;
      imapHost?: string;
      imapPort?: number;
      imapUser?: string;
      imapPassword?: string;
      imapTls?: boolean;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      smtpTls?: boolean;
      channelId?: string;
      workspaceId?: string;
      isShared?: boolean;
    },
  ) {
    if (!data.emailAddress || !data.emailAddress.includes('@')) {
      throw new BadRequestException('A valid email address is required.');
    }

    const cleanEmail = data.emailAddress.trim().toLowerCase();

    let workspaceId = data.workspaceId;
    let channelId = data.channelId;
    let isShared = !!data.isShared || !!channelId;

    if (channelId) {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: { id: true, workspaceId: true, name: true },
      });
      if (channel) {
        workspaceId = channel.workspaceId;
        if (!data.displayName) {
          data.displayName = `#${channel.name} Group Inbox`;
        }
      }
    }

    // Enforce role check: Only Admins/Owners (SuperAdmins) can connect a group/shared mailbox
    if (isShared || channelId) {
      const hasPermission = await this.verifyAdminOrOwnerRole(userId, workspaceId, channelId);
      if (!hasPermission) {
        throw new ForbiddenException(
          'Group mail sync can only be connected by Workspace Admins and Owners (SuperAdmins).'
        );
      }
    }

    // Verify IMAP connection if credentials provided
    if (data.imapHost && data.imapPassword) {
      const preferredHost = data.imapHost.trim();
      const candidateHosts = Array.from(new Set([
        preferredHost,
        preferredHost.replace(/^mail1\./, 'mail.'),
        preferredHost.replace(/^mail\./, 'mail1.'),
      ]));
      const preferredUser = data.imapUser?.trim() || cleanEmail;
      const candidateUsers = Array.from(new Set([preferredUser, cleanEmail, cleanEmail.split('@')[0]]));

      let imapConnected = false;
      let lastImapError: any = null;
      let workingHost = preferredHost;
      let workingUser = preferredUser;

      imapLoop:
      for (const hostCandidate of candidateHosts) {
        for (const userCandidate of candidateUsers) {
          const client = new ImapFlow({
            host: hostCandidate,
            port: data.imapPort || 993,
            secure: data.imapTls !== false,
            auth: {
              user: userCandidate,
              pass: data.imapPassword,
            },
            tls: {
              rejectUnauthorized: false,
            },
            logger: false,
          });

          try {
            await client.connect();
            await client.logout();
            workingHost = hostCandidate;
            workingUser = userCandidate;
            imapConnected = true;
            break imapLoop;
          } catch (err: any) {
            lastImapError = err;
          }
        }
      }

      if (!imapConnected) {
        let detail = lastImapError?.responseText || lastImapError?.message || 'Invalid username, password, or server settings';
        if (
          detail.includes('Unexpected close') ||
          detail.includes('AUTHENTICATE failed') ||
          detail.includes('LOGIN failed') ||
          detail.includes('Command failed')
        ) {
          detail = `Authentication failed. If your organization uses Zimbra or 2FA, you must use an Application Passcode (from Zimbra Preferences -> Accounts -> Applications -> Add Application Code) instead of your regular webmail login password.`;
        }
        throw new BadRequestException(`IMAP verification failed: ${detail}`);
      }

      data.imapHost = workingHost;
      data.imapUser = workingUser;
    }

    // Verify SMTP connection if credentials provided
    if (data.smtpHost && data.smtpPassword) {
      const preferredHost = data.smtpHost.trim();
      const candidateHosts = Array.from(new Set([
        preferredHost,
        preferredHost.replace(/^mail\./, 'mail1.'),
        preferredHost.replace(/^mail1\./, 'mail.'),
      ]));
      const preferredPort = Number(data.smtpPort) || 587;
      const candidatePorts = preferredPort === 465 ? [465, 587, 25] : [preferredPort, 587, 465, 25];
      const uniquePorts = Array.from(new Set(candidatePorts));
      const preferredUser = data.smtpUser?.trim() || cleanEmail;
      const candidateUsers = Array.from(new Set([preferredUser, cleanEmail, cleanEmail.split('@')[0]]));

      let smtpVerified = false;
      let lastSmtpError: any = null;
      let workingHost = preferredHost;
      let workingPort = preferredPort;
      let workingUser = preferredUser;

      outerLoop:
      for (const hostCandidate of candidateHosts) {
        for (const userCandidate of candidateUsers) {
          for (const port of uniquePorts) {
            try {
              const transporter = nodemailer.createTransport({
                host: hostCandidate,
                port,
                secure: port === 465,
                auth: {
                  user: userCandidate,
                  pass: data.smtpPassword,
                },
                tls: {
                  rejectUnauthorized: false,
                },
                connectionTimeout: 8000,
              });

              await transporter.verify();
              workingHost = hostCandidate;
              workingPort = port;
              workingUser = userCandidate;
              smtpVerified = true;
              break outerLoop;
            } catch (err: any) {
              lastSmtpError = err;
            }
          }
        }
      }

      if (!smtpVerified) {
        throw new BadRequestException(
          `SMTP verification failed: ${lastSmtpError?.message || 'Could not authenticate with SMTP server. Please check host, port, and password.'}`,
        );
      }

      data.smtpHost = workingHost;
      data.smtpPort = workingPort;
      data.smtpUser = workingUser;
    }

    const savedAccount = await this.upsertAccountAndSeed(userId, {
      emailAddress: cleanEmail,
      provider: data.provider || EmailProvider.CUSTOM,
      displayName: data.displayName || cleanEmail.split('@')[0],
      accessToken: 'custom_token',
      imapHost: data.imapHost?.trim(),
      imapPort: data.imapPort,
      imapUser: data.imapUser?.trim() || cleanEmail,
      imapPassword: data.imapPassword,
      imapTls: data.imapTls !== false,
      smtpHost: data.smtpHost?.trim(),
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser?.trim() || cleanEmail,
      smtpPassword: data.smtpPassword,
      smtpTls: data.smtpTls !== false,
      workspaceId,
      channelId,
      isShared,
    });

    // If live IMAP configured, perform initial sync right away
    if (savedAccount.imapHost && (savedAccount as any).imapPassword) {
      try {
        await this.syncCustomImapAccount(savedAccount);
      } catch (syncErr) {
        console.warn('Initial IMAP sync warning:', syncErr);
      }
    }

    return savedAccount;
  }

  // Helper to upsert account & seed initial emails
  private async upsertAccountAndSeed(
    userId: string,
    accountData: {
      emailAddress: string;
      provider: EmailProvider;
      displayName: string;
      accessToken?: string;
      refreshToken?: string;
      imapHost?: string;
      imapPort?: number;
      imapUser?: string;
      imapPassword?: string;
      imapTls?: boolean;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      smtpTls?: boolean;
      workspaceId?: string;
      channelId?: string;
      isShared?: boolean;
      allowedDomains?: string[];
    },
  ) {
    // If setting group mailbox / shared status, verify admin or owner role
    if (accountData.isShared || accountData.channelId) {
      const hasPermission = await this.verifyAdminOrOwnerRole(
        userId,
        accountData.workspaceId,
        accountData.channelId,
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          'Group mail sync can only be configured by Workspace Admins and Owners (SuperAdmins).'
        );
      }
    }
    let account = await this.prisma.emailAccount.findUnique({
      where: {
        userId_emailAddress: {
          userId,
          emailAddress: accountData.emailAddress,
        },
      },
    });

    if (!account) {
      account = await this.prisma.emailAccount.create({
        data: {
          userId,
          emailAddress: accountData.emailAddress,
          provider: accountData.provider,
          displayName: accountData.displayName,
          accessToken: accountData.accessToken,
          refreshToken: accountData.refreshToken,
          imapHost: accountData.imapHost,
          imapPort: accountData.imapPort,
          imapUser: accountData.imapUser,
          imapPassword: accountData.imapPassword,
          imapTls: accountData.imapTls ?? true,
          smtpHost: accountData.smtpHost,
          smtpPort: accountData.smtpPort,
          smtpUser: accountData.smtpUser,
          smtpPassword: accountData.smtpPassword,
          smtpTls: accountData.smtpTls ?? true,
          workspaceId: accountData.workspaceId,
          channelId: accountData.channelId,
          isShared: accountData.isShared || false,
          allowedDomains:
            accountData.allowedDomains !== undefined
              ? accountData.allowedDomains
              : accountData.isShared || accountData.channelId
              ? ['patterns247.net']
              : [],
          lastSyncedAt: new Date(),
        },
      });

      // Seed realistic corporate welcome emails for immediate testing if not live IMAP
      if (!accountData.imapHost) {
        await this.seedInitialEmailsForAccount(account.id, account.emailAddress);
      }
    } else {
      account = await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          accessToken: accountData.accessToken || account.accessToken,
          refreshToken: accountData.refreshToken || account.refreshToken,
          imapHost: accountData.imapHost !== undefined ? accountData.imapHost : (account as any).imapHost,
          imapPort: accountData.imapPort !== undefined ? accountData.imapPort : (account as any).imapPort,
          imapUser: accountData.imapUser !== undefined ? accountData.imapUser : (account as any).imapUser,
          imapPassword: accountData.imapPassword !== undefined ? accountData.imapPassword : (account as any).imapPassword,
          imapTls: accountData.imapTls !== undefined ? accountData.imapTls : (account as any).imapTls,
          smtpHost: accountData.smtpHost !== undefined ? accountData.smtpHost : (account as any).smtpHost,
          smtpPort: accountData.smtpPort !== undefined ? accountData.smtpPort : (account as any).smtpPort,
          smtpUser: accountData.smtpUser !== undefined ? accountData.smtpUser : (account as any).smtpUser,
          smtpPassword: accountData.smtpPassword !== undefined ? accountData.smtpPassword : (account as any).smtpPassword,
          smtpTls: accountData.smtpTls !== undefined ? accountData.smtpTls : (account as any).smtpTls,
          workspaceId: accountData.workspaceId || account.workspaceId,
          channelId: accountData.channelId !== undefined ? accountData.channelId : account.channelId,
          isShared: accountData.isShared !== undefined ? accountData.isShared : account.isShared,
          allowedDomains:
            accountData.allowedDomains !== undefined
              ? accountData.allowedDomains
              : account.allowedDomains && account.allowedDomains.length > 0
              ? account.allowedDomains
              : accountData.isShared || account.isShared
              ? ['patterns247.net']
              : [],
          displayName: accountData.displayName || account.displayName,
          lastSyncedAt: new Date(),
          isActive: true,
        },
      });
    }

    // Broadcast account connected if shared with channel/workspace
    if (account.isShared && this.messagesGateway?.server) {
      if (account.channelId) {
        this.messagesGateway.server.to(`channel:${account.channelId}`).emit('group_inbox_updated', {
          accountId: account.id,
          channelId: account.channelId,
        });
      }
      if (account.workspaceId) {
        this.messagesGateway.server.to(`workspace:${account.workspaceId}`).emit('group_inbox_updated', {
          accountId: account.id,
          workspaceId: account.workspaceId,
        });
      }
    }

    return account;
  }

  private async seedInitialEmailsForAccount(accountId: string, userEmail: string) {
    const sampleEmails = [
      {
        externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
        folder: EmailFolder.INBOX,
        fromName: 'Google Cloud Platform',
        fromAddress: 'cloud-noreply@google.com',
        toAddresses: [userEmail],
        subject: 'Welcome to Google Cloud & Patterns Communication OAuth Service',
        snippet: 'Your OAuth integration has been verified. You can now synchronize messages securely across Patterns...',
        bodyHtml: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
            <h2 style="color: #4f46e5; margin-bottom: 8px;">Google Cloud OAuth Authorization Verified</h2>
            <p>Hello,</p>
            <p>Your email account <strong>${userEmail}</strong> was successfully connected to <strong>Patterns Communication</strong> via Google OAuth 2.0.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; font-weight: 600; color: #0f172a;">OAuth Permissions Granted:</p>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #475569;">
                <li>Read incoming inbox messages and threads</li>
                <li>Send outbound emails via Gmail API</li>
                <li>Secure token refresh delegation</li>
              </ul>
            </div>
            <p>You can manage your connected apps anytime from your Google Account Security Dashboard.</p>
            <p style="color: #64748b; font-size: 13px;">Best regards,<br/>The Google Cloud Platform Team</p>
          </div>
        `,
        isRead: false,
        isStarred: true,
        hasAttachments: false,
        receivedAt: new Date(),
      },
      {
        externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
        folder: EmailFolder.INBOX,
        fromName: 'Sarah Jenkins',
        fromAddress: 'sarah.jenkins@patterns.com',
        toAddresses: [userEmail],
        ccAddresses: ['dev-team@patterns.com'],
        subject: 'Q4 Product Roadmap & Sprint Deliverables Review',
        snippet: 'Hi team, please find attached the reviewed sprint goals and client deliverables for next week...',
        bodyHtml: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
            <p>Hi Team,</p>
            <p>Great progress on the sprint deliverables this week! Below are the key milestones scheduled for our upcoming deployment:</p>
            <ol style="margin: 12px 0; padding-left: 20px;">
              <li><strong>WebRTC Calling:</strong> 1-on-1 voice & video with screen share & speaker selector</li>
              <li><strong>Group Meetings:</strong> Multi-user video grid with Google Meet style room codes</li>
              <li><strong>OAuth Mail Inbox:</strong> Integrated company email sync right inside Patterns</li>
            </ol>
            <p>Let's review these during our daily sync today. Feel free to share this thread in the <code>#general</code> channel!</p>
            <p>Cheers,<br/><strong>Sarah Jenkins</strong><br/>Head of Product, Patterns</p>
          </div>
        `,
        isRead: true,
        isStarred: false,
        hasAttachments: true,
        attachmentsJson: [
          {
            fileName: 'Patterns_Roadmap_Q4.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: 420000,
            contentType: 'application/pdf',
          },
        ],
        receivedAt: new Date(Date.now() - 3600000 * 3),
      },
      {
        externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
        folder: EmailFolder.INBOX,
        fromName: 'David Chen',
        fromAddress: 'david.chen@acme-corp.com',
        toAddresses: [userEmail],
        subject: 'Contract Signed & Kickoff Scheduling',
        snippet: 'Hey! We just completed signing the enterprise agreement. When can we schedule the technical kickoff?',
        bodyHtml: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
            <p>Hi,</p>
            <p>We are thrilled to officially partner with Patterns Communication! The contract has been countersigned by our legal department.</p>
            <p>Can we jump on a video meeting tomorrow afternoon around 3:00 PM EST? You can send over a meeting link or invite.</p>
            <p>Looking forward to working together!</p>
            <p>Best regards,<br/><strong>David Chen</strong><br/>VP of Engineering, Acme Corp</p>
          </div>
        `,
        isRead: false,
        isStarred: true,
        hasAttachments: false,
        receivedAt: new Date(Date.now() - 3600000 * 8),
      },
      {
        externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
        folder: EmailFolder.SENT,
        fromName: 'Me',
        fromAddress: userEmail,
        toAddresses: ['david.chen@acme-corp.com'],
        subject: 'Re: Enterprise Agreement & Welcome to Patterns',
        snippet: 'Thanks David, we are excited to have you on board! I have attached our architecture overview...',
        bodyHtml: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
            <p>Hi David,</p>
            <p>Thank you for the quick turnaround on the contract! Looking forward to tomorrow's kickoff call.</p>
            <p>Talk soon!</p>
          </div>
        `,
        isRead: true,
        isStarred: false,
        hasAttachments: false,
        receivedAt: new Date(Date.now() - 3600000 * 24),
      },
    ];

    for (const email of sampleEmails) {
      await this.prisma.emailMessage.create({
        data: {
          accountId,
          ...email,
        },
      });
    }
  }

  // Disconnect an account (personal by owner, group mailbox by Admins/Owners)
  async disconnectAccount(userId: string, accountId: string) {
    const { account, isAdmin } = await this.validateAccountAccess(userId, accountId);
    if (account.isShared && !isAdmin) {
      throw new ForbiddenException('Only Workspace Admins and Owners can disconnect a group mailbox.');
    }
    if (!account.isShared && account.userId !== userId) {
      throw new ForbiddenException('You can only disconnect your own email account.');
    }

    await this.prisma.emailAccount.delete({
      where: { id: accountId },
    });

    return { success: true, message: 'Email account disconnected successfully' };
  }

  // Update allowed domain filters for a Shared Group Mailbox (Restricted to Workspace Admins and Owners)
  async updateAllowedDomains(userId: string, accountId: string, allowedDomains: string[]) {
    const { account, isAdmin } = await this.validateAccountAccess(userId, accountId);

    let canManage = isAdmin;
    if (!canManage && (account.workspaceId || account.channelId)) {
      canManage = await this.verifyAdminOrOwnerRole(userId, account.workspaceId, account.channelId);
    }

    if (!canManage) {
      throw new ForbiddenException(
        'Only Workspace Admins and Owners can manage Group Mailbox domain filters.'
      );
    }

    if (!account.isShared) {
      throw new BadRequestException('Allowed domain filters are only applicable to Shared Group Mailboxes.');
    }

    const cleanedDomains = Array.from(
      new Set(
        (allowedDomains || [])
          .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
          .filter(Boolean),
      ),
    );

    const updated = await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        allowedDomains: cleanedDomains,
      },
      select: {
        id: true,
        emailAddress: true,
        isShared: true,
        allowedDomains: true,
      },
    });

    // Purge non-matching messages and duplicates immediately from this shared group inbox
    await this.purgeNonAllowedMessages(updated);
    await this.purgeDuplicateMessages(accountId);

    // Trigger sync in background to fetch emails for newly added domains
    this.syncAccount(userId, accountId).catch((err) => {
      console.warn(`Background sync after allowed domains update failed: ${err.message}`);
    });

    return {
      success: true,
      account: updated,
      message: 'Group mailbox allowed domains updated successfully',
    };
  }

  // Check whether an email matches allowed domains for shared group mailboxes
  isEmailAllowed(
    fromAddress: string,
    toAddresses: string[] = [],
    allowedDomains: string[] = [],
  ): boolean {
    if (!allowedDomains || allowedDomains.length === 0) {
      return true; // No restriction
    }

    const cleanDomains = allowedDomains
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    if (cleanDomains.length === 0) return true;

    const matchesDomain = (addr: string) => {
      if (!addr) return false;
      const lower = addr.trim().toLowerCase();
      const match = lower.match(/<([^>]+)>/);
      const emailOnly = match ? match[1].trim() : lower;
      const domainPart = emailOnly.includes('@') ? emailOnly.split('@')[1] : emailOnly;

      return cleanDomains.some((dom) => {
        return (
          domainPart === dom ||
          domainPart.endsWith(`.${dom}`) ||
          emailOnly.includes(`@${dom}`)
        );
      });
    };

    if (matchesDomain(fromAddress)) return true;
    if (toAddresses && toAddresses.some((addr) => matchesDomain(addr))) return true;

    return false;
  }

  // Fetch messages with filters, folders, search, pagination, and Handled/Done status
  async getMessages(
    userId: string,
    query: {
      accountId?: string;
      workspaceId?: string;
      folder?: string;
      status?: 'all' | 'unhandled' | 'done';
      tag?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    let accountIds: string[] = [];
    let targetAccount: any = null;

    if (query.accountId) {
      const { account } = await this.validateAccountAccess(userId, query.accountId);
      accountIds = [query.accountId];
      targetAccount = account;
    } else {
      const accessibleAccounts = await this.getAccounts(userId, query.workspaceId);
      accountIds = accessibleAccounts.map((a) => a.id);
    }

    if (accountIds.length === 0) {
      return { messages: [], total: 0, page: 1, totalPages: 0 };
    }

    const folder = (query.folder?.toUpperCase() as EmailFolder) || EmailFolder.INBOX;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      accountId: { in: accountIds },
    };

    // If shared group mailbox, filter messages to only show allowed domains
    if (targetAccount?.isShared && targetAccount.allowedDomains && targetAccount.allowedDomains.length > 0) {
      const cleanList = targetAccount.allowedDomains
        .map((d: string) => d.replace(/^@/, '').trim().toLowerCase())
        .filter(Boolean);
      if (cleanList.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: cleanList.flatMap((d: string) => [
              { fromAddress: { endsWith: `@${d}`, mode: 'insensitive' } },
              { fromAddress: { contains: `@${d}`, mode: 'insensitive' } },
            ]),
          },
        ];
      }
    }

    if (folder === EmailFolder.STARRED) {
      where.isStarred = true;
    } else {
      where.folder = folder;
    }

    // Status filter: unhandled vs done
    if (query.status === 'unhandled') {
      where.isHandled = false;
    } else if (query.status === 'done') {
      where.isHandled = true;
    }

    // Front-style Tag filter
    if (query.tag && query.tag !== 'all') {
      where.tags = { has: query.tag };
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { snippet: { contains: q, mode: 'insensitive' } },
        { fromName: { contains: q, mode: 'insensitive' } },
        { fromAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, messages] = await Promise.all([
      this.prisma.emailMessage.count({ where }),
      this.prisma.emailMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          accountId: true,
          externalMessageId: true,
          folder: true,
          fromName: true,
          fromAddress: true,
          toAddresses: true,
          ccAddresses: true,
          subject: true,
          snippet: true,
          isRead: true,
          isStarred: true,
          isHandled: true,
          handledById: true,
          handledByName: true,
          handledAt: true,
          sentById: true,
          sentByName: true,
          hasAttachments: true,
          attachmentsJson: true,
          tags: true,
          receivedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const seenExternal = new Set<string>();
    const uniqueMessages: any[] = [];
    for (const m of messages) {
      const key = `${m.accountId}_${m.externalMessageId}`;
      if (!seenExternal.has(key)) {
        seenExternal.add(key);
        uniqueMessages.push({
          ...m,
          tags: Array.isArray(m.tags) ? m.tags : [],
          attachments: (m.attachmentsJson as any[]) || [],
        });
      }
    }

    return {
      messages: uniqueMessages,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  // Get single full email message with body
  async getMessageById(userId: string, messageId: string) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: {
        account: {
          select: {
            id: true,
            emailAddress: true,
            displayName: true,
            userId: true,
            provider: true,
            isShared: true,
            channelId: true,
            workspaceId: true,
          },
        },
        handledBy: { select: { id: true, name: true, avatarUrl: true } },
        sentBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!message) {
      throw new NotFoundException('Email message not found');
    }

    await this.validateAccountAccess(userId, message.accountId);

    // Auto mark as read on view
    if (!message.isRead) {
      await this.prisma.emailMessage.update({
        where: { id: messageId },
        data: { isRead: true },
      });
      message.isRead = true;

      // Broadcast read update once to all team members across devices
      if (this.messagesGateway?.server) {
        const readPayload = {
          messageId,
          accountId: message.accountId,
          folder: message.folder,
          isRead: true,
          readBy: { id: userId },
        };
        if (message.account.workspaceId) {
          this.messagesGateway.server.to(`workspace:${message.account.workspaceId}`).emit('email_read_updated', readPayload);
        } else if (message.account.channelId) {
          this.messagesGateway.server.to(`channel:${message.account.channelId}`).emit('email_read_updated', readPayload);
        } else if (message.account.userId) {
          this.messagesGateway.server.to(`user:${message.account.userId}`).emit('email_read_updated', readPayload);
        }
      }

      if (message.account?.provider === EmailProvider.GOOGLE && message.externalMessageId) {
        this.syncLabelToGmail(message.account, message.externalMessageId, [], ['UNREAD']).catch(() => {});
      }
    }

    return {
      ...message,
      attachments: (message.attachmentsJson as any[]) || [],
    };
  }

  // Toggle read/unread status with group sync
  async toggleRead(userId: string, messageId: string, isRead?: boolean) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const { account } = await this.validateAccountAccess(userId, message.accountId);

    const newRead = isRead !== undefined ? isRead : !message.isRead;
    const updated = await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { isRead: newRead },
    });

    // Broadcast real-time read update once to all group members across devices
    if (this.messagesGateway?.server) {
      const readPayload = {
        messageId,
        accountId: account.id,
        folder: message.folder,
        isRead: newRead,
        readBy: { id: userId },
      };
      if (account.workspaceId) {
        this.messagesGateway.server.to(`workspace:${account.workspaceId}`).emit('email_read_updated', readPayload);
      } else if (account.channelId) {
        this.messagesGateway.server.to(`channel:${account.channelId}`).emit('email_read_updated', readPayload);
      } else if (account.userId) {
        this.messagesGateway.server.to(`user:${account.userId}`).emit('email_read_updated', readPayload);
      }
    }

    if (message.account?.provider === EmailProvider.GOOGLE && message.externalMessageId) {
      this.syncLabelToGmail(
        message.account,
        message.externalMessageId,
        newRead ? [] : ['UNREAD'],
        newRead ? ['UNREAD'] : [],
      ).catch(() => {});
    }
    return updated;
  }

  // Toggle Handled / Done status with instant cross-device team sync
  async toggleHandled(userId: string, messageId: string, isHandled?: boolean) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const { account } = await this.validateAccountAccess(userId, message.accountId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });

    const targetHandled = isHandled !== undefined ? isHandled : !message.isHandled;

    const updated = await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: {
        isHandled: targetHandled,
        handledById: targetHandled ? userId : null,
        handledByName: targetHandled ? (user?.name || 'Team Member') : null,
        handledAt: targetHandled ? new Date() : null,
        ...(targetHandled ? { isRead: true } : {}),
      },
    });

    // Broadcast to all team members across all devices via Socket.IO
    if (this.messagesGateway?.server) {
      const payload = {
        messageId,
        accountId: account.id,
        isHandled: targetHandled,
        isRead: updated.isRead,
        handledBy: targetHandled ? { id: userId, name: user?.name, avatarUrl: user?.avatarUrl } : null,
        handledAt: updated.handledAt,
      };

      if (account.workspaceId) {
        this.messagesGateway.server.to(`workspace:${account.workspaceId}`).emit('email_handled_updated', payload);
      } else if (account.channelId) {
        this.messagesGateway.server.to(`channel:${account.channelId}`).emit('email_handled_updated', payload);
      } else if (account.userId) {
        this.messagesGateway.server.to(`user:${account.userId}`).emit('email_handled_updated', payload);
      }
    }

    return updated;
  }

  // Toggle star
  async toggleStar(userId: string, messageId: string) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.validateAccountAccess(userId, message.accountId);

    const newStarred = !message.isStarred;
    const updated = await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { isStarred: newStarred },
    });
    if (message.account?.provider === EmailProvider.GOOGLE && message.externalMessageId) {
      this.syncLabelToGmail(
        message.account,
        message.externalMessageId,
        newStarred ? ['STARRED'] : [],
        newStarred ? [] : ['STARRED'],
      ).catch(() => {});
    }
    return updated;
  }

  // Move email between folders (e.g. INBOX <-> SPAM, TRASH, etc.)
  async moveMessageFolder(userId: string, messageId: string, targetFolder: EmailFolder) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.validateAccountAccess(userId, message.accountId);

    const updated = await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { folder: targetFolder },
    });

    // If moving from SPAM to INBOX on Google, remove SPAM label and add INBOX label
    if (message.account?.provider === EmailProvider.GOOGLE && message.externalMessageId) {
      if (targetFolder === EmailFolder.INBOX && message.folder === EmailFolder.SPAM) {
        this.syncLabelToGmail(message.account, message.externalMessageId, ['INBOX'], ['SPAM']).catch(() => {});
      } else if (targetFolder === EmailFolder.SPAM) {
        this.syncLabelToGmail(message.account, message.externalMessageId, ['SPAM'], ['INBOX']).catch(() => {});
      }
    }

    return { success: true, folder: updated.folder, message: updated };
  }

  // Update tags on email message with real-time sync across devices and channels
  async updateTags(userId: string, messageId: string, tags: string[]) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const { account } = await this.validateAccountAccess(userId, message.accountId);

    // Sanitize tags: trim, remove duplicates & empties, max 30 chars per tag, max 10 tags
    const cleanTags = Array.from(
      new Set(
        (Array.isArray(tags) ? tags : [])
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t) => t.length > 0 && t.length <= 30),
      ),
    ).slice(0, 10);

    const updated = await this.prisma.emailMessage.update({
      where: { id: messageId },
      data: { tags: cleanTags },
    });

    // Broadcast real-time tag update via Socket.IO
    if (this.messagesGateway?.server) {
      const payload = {
        messageId,
        accountId: account.id,
        tags: cleanTags,
        updatedById: userId,
      };

      if (account.channelId) {
        this.messagesGateway.server.to(`channel:${account.channelId}`).emit('email_tags_updated', payload);
      }
      if (account.workspaceId) {
        this.messagesGateway.server.to(`workspace:${account.workspaceId}`).emit('email_tags_updated', payload);
      }
      this.messagesGateway.server.to(`user:${account.userId}`).emit('email_tags_updated', payload);
      this.messagesGateway.server.to(`user:${userId}`).emit('email_tags_updated', payload);
    }

    return updated;
  }

  // Get all custom tags for a workspace
  async getWorkspaceTags(userId: string, workspaceId: string) {
    if (!workspaceId) return [];
    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!wsMember) {
      throw new ForbiddenException('Access to workspace denied');
    }

    return this.prisma.mailTag.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Create a new custom tag in workspace
  async createCustomTag(
    userId: string,
    data: {
      workspaceId: string;
      name: string;
      color?: string;
      bg?: string;
      text?: string;
      border?: string;
    },
  ) {
    if (!data.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: data.workspaceId, userId } },
    });
    if (!wsMember) {
      throw new ForbiddenException('Access to workspace denied');
    }

    const cleanName = data.name?.trim();
    if (!cleanName || cleanName.length > 30) {
      throw new BadRequestException('Tag name must be between 1 and 30 characters');
    }

    // Check if tag already exists in workspace (case-insensitive)
    const existing = await this.prisma.mailTag.findFirst({
      where: {
        workspaceId: data.workspaceId,
        name: { equals: cleanName, mode: 'insensitive' },
      },
    });
    if (existing) {
      return existing;
    }

    const tag = await this.prisma.mailTag.create({
      data: {
        workspaceId: data.workspaceId,
        name: cleanName,
        color: data.color || '#6366f1',
        bg: data.bg || 'bg-indigo-50',
        text: data.text || 'text-indigo-700',
        border: data.border || 'border-indigo-200',
        createdById: userId,
      },
    });

    if (this.messagesGateway?.server) {
      this.messagesGateway.server.to(`workspace:${data.workspaceId}`).emit('mail_tag_created', tag);
    }

    return tag;
  }

  // Delete a custom tag
  async deleteCustomTag(userId: string, tagId: string) {
    const tag = await this.prisma.mailTag.findUnique({
      where: { id: tagId },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: tag.workspaceId, userId } },
    });
    if (!wsMember) {
      throw new ForbiddenException('Access to workspace denied');
    }

    await this.prisma.mailTag.delete({
      where: { id: tagId },
    });

    if (this.messagesGateway?.server) {
      this.messagesGateway.server.to(`workspace:${tag.workspaceId}`).emit('mail_tag_deleted', {
        tagId,
        name: tag.name,
      });
    }

    return { success: true, id: tagId };
  }

  // Send new email (or reply on behalf of group mailbox) with full attachment support
  async sendMessage(
    userId: string,
    data: {
      accountId: string;
      to: string[];
      cc?: string[];
      subject: string;
      bodyHtml: string;
      bodyText?: string;
      replyToMessageId?: string;
      attachments?: Array<{
        fileName: string;
        fileUrl?: string;
        fileSize?: number;
        contentType?: string;
        base64Data?: string;
      }>;
    },
  ) {
    const { account } = await this.validateAccountAccess(userId, data.accountId);
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    const cleanTo = data.to.filter((t) => t && t.includes('@'));
    if (cleanTo.length === 0) {
      throw new BadRequestException('At least one valid recipient is required');
    }

    let externalMessageId = `sent_${Math.random().toString(36).substring(2, 9)}`;

    let sentViaGmail = false;
    let gmailError: string | null = null;

    // If connected to Google with OAuth token, dispatch live email via Gmail API
    if (account.provider === EmailProvider.GOOGLE) {
      try {
        const validToken = await this.getValidGoogleAccessToken(account);
        if (validToken) {
          let rawEmail = '';
          const hasAtts = data.attachments && data.attachments.length > 0;

          if (hasAtts) {
            const boundary = `====boundary_${Date.now().toString(16)}====`;
            const lines: string[] = [
              `From: ${account.emailAddress}`,
              `To: ${cleanTo.join(', ')}`,
              data.cc?.length ? `Cc: ${data.cc.join(', ')}` : '',
              `Subject: =?utf-8?B?${Buffer.from(data.subject || '(no subject)').toString('base64')}?=`,
              'MIME-Version: 1.0',
              `Content-Type: multipart/mixed; boundary="${boundary}"`,
              '',
              `--${boundary}`,
              'Content-Type: text/html; charset=utf-8',
              'Content-Transfer-Encoding: 7bit',
              '',
              data.bodyHtml || data.bodyText || '',
            ];

            for (const att of data.attachments || []) {
              const cleanB64 = (att.base64Data || '')
                .replace(/^data:[^;]+;base64,/, '')
                .replace(/\s/g, '');
              lines.push(
                `--${boundary}`,
                `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.fileName}"`,
                `Content-Disposition: attachment; filename="${att.fileName}"`,
                'Content-Transfer-Encoding: base64',
                '',
                cleanB64,
              );
            }
            lines.push(`--${boundary}--`);
            rawEmail = lines.filter((l) => l !== '').join('\r\n');
          } else {
            rawEmail = [
              `From: ${account.emailAddress}`,
              `To: ${cleanTo.join(', ')}`,
              data.cc?.length ? `Cc: ${data.cc.join(', ')}` : '',
              `Subject: =?utf-8?B?${Buffer.from(data.subject || '(no subject)').toString('base64')}?=`,
              'MIME-Version: 1.0',
              'Content-Type: text/html; charset=utf-8',
              '',
              data.bodyHtml || data.bodyText || '',
            ]
              .filter((l) => l !== '')
              .join('\r\n');
          }

          const encodedRaw = Buffer.from(rawEmail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

          const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${validToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: encodedRaw }),
          });

          if (sendRes.ok) {
            const sendData = await sendRes.json();
            if (sendData.id) {
              externalMessageId = sendData.id;
              sentViaGmail = true;
            }
          } else {
            const errBody = await sendRes.text();
            console.warn('Gmail API send failed:', sendRes.status, errBody);
            gmailError = sendRes.status === 403 || sendRes.status === 401 ? 'REQUIRES_REAUTH' : 'SEND_FAILED';
          }
        } else {
          gmailError = 'NO_TOKEN';
        }
      } catch (err: any) {
        console.warn('Gmail API send fallback to local:', err);
        gmailError = err?.message || 'SEND_ERROR';
      }
    }

    let sentViaMicrosoft = false;
    let msError: string | null = null;

    // If connected to Microsoft with OAuth token, dispatch live email via Microsoft Graph API
    if (account.provider === EmailProvider.MICROSOFT) {
      try {
        const validToken = await this.getValidMicrosoftAccessToken(account);
        if (validToken) {
          const sendRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${validToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                subject: data.subject || '(no subject)',
                body: {
                  contentType: 'HTML',
                  content: data.bodyHtml || data.bodyText || '',
                },
                toRecipients: cleanTo.map((addr: string) => ({ emailAddress: { address: addr } })),
                ccRecipients: (data.cc || []).map((addr: string) => ({ emailAddress: { address: addr } })),
              },
              saveToSentItems: 'true',
            }),
          });

          if (sendRes.ok) {
            sentViaMicrosoft = true;
          } else {
            const errBody = await sendRes.text();
            console.warn('Microsoft Graph API send failed:', sendRes.status, errBody);
            msError = sendRes.status === 403 || sendRes.status === 401 ? 'REQUIRES_REAUTH' : 'SEND_FAILED';
          }
        } else {
          msError = 'NO_TOKEN';
        }
      } catch (err: any) {
        console.warn('Microsoft Graph API send error:', err);
        msError = err?.message || 'SEND_ERROR';
      }
    }

    let sentViaSmtp = false;
    let smtpError: string | null = null;

    // If custom company email with SMTP credentials, dispatch live via SMTP
    if (account.provider === EmailProvider.CUSTOM && (account as any).smtpHost && (account as any).smtpPassword) {
      try {
        const smtpPort = Number((account as any).smtpPort) || 587;
        const transporter = nodemailer.createTransport({
          host: (account as any).smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: (account as any).smtpUser || account.emailAddress,
            pass: (account as any).smtpPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const mailAttachments = (data.attachments || [])
          .filter((att) => att.fileUrl || att.base64Data)
          .map((att) => {
            if (att.base64Data) {
              return {
                filename: att.fileName,
                content: Buffer.from(att.base64Data, 'base64'),
                contentType: att.contentType,
              };
            }
            const fileUrl = att.fileUrl || '';
            const cleanPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
            return {
              filename: att.fileName,
              path: join(process.cwd(), cleanPath),
              contentType: att.contentType,
            };
          });

        const sendInfo = await transporter.sendMail({
          from: `"${account.displayName || account.emailAddress.split('@')[0]}" <${account.emailAddress}>`,
          to: cleanTo,
          cc: data.cc || [],
          subject: data.subject || '(no subject)',
          html: data.bodyHtml,
          text: data.bodyText || (data.bodyHtml || '').replace(/<[^>]*>?/gm, ''),
          attachments: mailAttachments,
        });

        if (sendInfo.messageId) {
          externalMessageId = sendInfo.messageId;
          sentViaSmtp = true;
        }
      } catch (smtpErr: any) {
        console.warn('Custom SMTP send failed, falling back to internal record:', smtpErr);
        smtpError = smtpErr?.message || 'SMTP_SEND_FAILED';
      }
    }

    // Save sent message in SENT folder with sender attribution (On Behalf Of)
    const sentMessage = await this.prisma.emailMessage.create({
      data: {
        accountId: account.id,
        externalMessageId,
        folder: EmailFolder.SENT,
        fromName: account.displayName || account.emailAddress.split('@')[0],
        fromAddress: account.emailAddress,
        toAddresses: cleanTo,
        ccAddresses: data.cc || [],
        subject: data.subject || '(no subject)',
        snippet: (data.bodyText || data.bodyHtml || '').replace(/<[^>]*>?/gm, '').slice(0, 120),
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText || data.bodyHtml.replace(/<[^>]*>?/gm, ''),
        isRead: true,
        isStarred: false,
        isHandled: true,
        sentById: userId,
        sentByName: sender?.name || 'Team Member',
        hasAttachments: Boolean(data.attachments && data.attachments.length > 0),
        attachmentsJson: data.attachments || null,
        receivedAt: new Date(),
      },
    });

    // If this was a reply to an incoming email, auto-mark it as HANDLED/DONE by this sender!
    if (data.replyToMessageId) {
      await this.prisma.emailMessage.update({
        where: { id: data.replyToMessageId },
        data: {
          isHandled: true,
          handledById: userId,
          handledByName: sender?.name || 'Team Member',
          handledAt: new Date(),
          isRead: true,
        },
      });

      if (this.messagesGateway?.server) {
        const payload = {
          messageId: data.replyToMessageId,
          accountId: account.id,
          isHandled: true,
          isRead: true,
          handledBy: { id: userId, name: sender?.name },
          handledAt: new Date(),
        };
        if (account.workspaceId) {
          this.messagesGateway.server.to(`workspace:${account.workspaceId}`).emit('email_handled_updated', payload);
        } else if (account.channelId) {
          this.messagesGateway.server.to(`channel:${account.channelId}`).emit('email_handled_updated', payload);
        }
      }
    }

    // Broadcast new sent message to all group members across all devices
    if (this.messagesGateway?.server) {
      const sentPayload = {
        accountId: account.id,
        sentMessage,
      };
      if (account.workspaceId) {
        this.messagesGateway.server.to(`workspace:${account.workspaceId}`).emit('email_sent_updated', sentPayload);
      } else if (account.channelId) {
        this.messagesGateway.server.to(`channel:${account.channelId}`).emit('email_sent_updated', sentPayload);
      }
    }

    // Instant Delivery to Recipient Inboxes:
    // If any recipient address belongs to a connected mailbox in Patterns, deliver directly into their INBOX!
    try {
      const recipientEmails = Array.from(
        new Set(
          [...cleanTo, ...(data.cc || [])]
            .map((e) => e.toLowerCase().trim())
            .filter(Boolean),
        ),
      );

      const recipientAccounts = await this.prisma.emailAccount.findMany({
        where: {
          emailAddress: { in: recipientEmails },
        },
      });

      for (const recAcc of recipientAccounts) {
        if (
          recAcc.id === account.id &&
          !cleanTo.map((e) => e.toLowerCase().trim()).includes(account.emailAddress.toLowerCase().trim())
        ) {
          continue;
        }

        const newRecvMsg = await this.prisma.emailMessage.create({
          data: {
            accountId: recAcc.id,
            externalMessageId: `recv_${Math.random().toString(36).substring(2, 9)}`,
            folder: EmailFolder.INBOX,
            fromName: account.displayName || account.emailAddress.split('@')[0],
            fromAddress: account.emailAddress,
            toAddresses: cleanTo,
            ccAddresses: data.cc || [],
            subject: data.subject || '(no subject)',
            snippet: (data.bodyText || data.bodyHtml || '').replace(/<[^>]*>?/gm, '').slice(0, 120),
            bodyHtml: data.bodyHtml,
            bodyText: data.bodyText || data.bodyHtml.replace(/<[^>]*>?/gm, ''),
            isRead: false,
            isStarred: false,
            hasAttachments: Boolean(data.attachments && data.attachments.length > 0),
            attachmentsJson: data.attachments || null,
            receivedAt: new Date(),
          },
        });

        // Broadcast real-time notifications to all group members across all their devices
        if (this.messagesGateway?.server) {
          const recAccWithChannel = await this.prisma.emailAccount.findUnique({
            where: { id: recAcc.id },
            include: { channel: { select: { id: true, name: true } } },
          });
          const newEmailPayload = {
            messageId: newRecvMsg.id,
            accountId: recAcc.id,
            channelId: recAccWithChannel?.channelId,
            channelName: recAccWithChannel?.channel?.name,
            subject: data.subject || '(no subject)',
            fromName: account.displayName || account.emailAddress.split('@')[0],
            fromAddress: account.emailAddress,
          };
          if (recAccWithChannel?.channelId) {
            this.messagesGateway.server.to(`channel:${recAccWithChannel.channelId}`).emit('new_group_email', newEmailPayload);
          }
          if (recAccWithChannel?.workspaceId) {
            this.messagesGateway.server.to(`workspace:${recAccWithChannel.workspaceId}`).emit('new_group_email', newEmailPayload);
          }
          this.messagesGateway.server.to(`user:${recAcc.userId}`).emit('new_group_email', newEmailPayload);
        }
      }
    } catch (deliverErr) {
      console.warn('Internal inbox delivery warning:', deliverErr);
    }

    return {
      ...sentMessage,
      sentViaGmail,
      gmailError,
    };
  }

  // Delete message (moves to TRASH)
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const { account } = await this.validateAccountAccess(userId, message.accountId);

    if (message.folder === EmailFolder.TRASH) {
      await this.prisma.emailMessage.delete({ where: { id: messageId } });
      return { success: true, permanentlyDeleted: true };
    } else {
      await this.prisma.emailMessage.update({
        where: { id: messageId },
        data: { folder: EmailFolder.TRASH },
      });
      if (message.account?.provider === EmailProvider.GOOGLE && message.externalMessageId) {
        this.trashGmailMessage(message.account, message.externalMessageId).catch(() => {});
      }
      return { success: true, movedToTrash: true };
    }
  }

  // Forward / Share Email into a Channel or DM
  async shareToChannel(
    userId: string,
    messageId: string,
    channelId: string,
    userComment?: string,
  ) {
    const email = await this.getMessageById(userId, messageId);

    // Format rich markdown card for chat channel
    const text = [
      userComment ? `💬 **${userComment}**\n\n` : '',
      `📬 **Email Shared:** *${email.subject}*\n`,
      `**From:** ${email.fromName || email.fromAddress} <${email.fromAddress}>\n`,
      `**Date:** ${new Date(email.receivedAt).toLocaleString()}\n\n`,
      `> ${email.snippet || '(No snippet available)'}\n`,
    ].join('');

    const message = await this.prisma.message.create({
      data: {
        content: text,
        channelId,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return message;
  }


  // Helper to sync label modifications (read/unread/star) to Gmail API
  private async syncLabelToGmail(account: any, externalMessageId: string, addLabels: string[], removeLabels: string[]) {
    try {
      const token = await this.getValidGoogleAccessToken(account);
      if (!token) return;
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${externalMessageId}/modify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: addLabels,
          removeLabelIds: removeLabels,
        }),
      });
    } catch (err) {
      // Modify will succeed when token has gmail.modify scope
    }
  }

  // Helper to move message to trash on Gmail API
  private async trashGmailMessage(account: any, externalMessageId: string) {
    try {
      const token = await this.getValidGoogleAccessToken(account);
      if (!token) return;
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${externalMessageId}/trash`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {}
  }

  // Helper to ensure valid Google access token by refreshing if needed
  private async getValidGoogleAccessToken(account: { id: string; accessToken: string | null; refreshToken: string | null }): Promise<string | null> {
    if (!account.accessToken && !account.refreshToken) {
      this.accountReauthNeeded.set(account.id, true);
      return null;
    }

    const expiry = this.googleTokenExpiry.get(account.id) || 0;
    // If token exists and hasn't expired (with 2 min buffer), reuse directly (0 quota cost!)
    if (account.accessToken && Date.now() < expiry) {
      return account.accessToken;
    }

    // Refresh using refreshToken if available
    if (account.refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: account.refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          const newToken = refreshData.access_token;
          const expiresInSec = typeof refreshData.expires_in === 'number' ? refreshData.expires_in : 3599;
          this.googleTokenExpiry.set(account.id, Date.now() + (expiresInSec - 120) * 1000);
          this.accountReauthNeeded.delete(account.id);

          await this.prisma.emailAccount.update({
            where: { id: account.id },
            data: { accessToken: newToken },
          });
          return newToken;
        } else if (refreshData.error === 'invalid_grant') {
          console.error(`Google refresh token revoked for account ${account.id}:`, refreshData);
          this.accountReauthNeeded.set(account.id, true);
          return null;
        }
      } catch (err) {
        console.error('Failed to refresh Google access token:', err);
      }
    }

    // Fallback: If no expiry was set yet but accessToken exists, assume valid for now
    if (account.accessToken) {
      this.googleTokenExpiry.set(account.id, Date.now() + 1800 * 1000);
      return account.accessToken;
    }

    return null;
  }

  // Extract HTML and Plain Text from nested Gmail payload parts
  private extractGmailBody(payload: any): { html?: string; text?: string } {
    let html: string | undefined;
    let text: string | undefined;

    const decodeBase64Url = (str: string): string => {
      try {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString('utf-8');
      } catch {
        return '';
      }
    };

    const walk = (part: any) => {
      if (!part) return;
      if (part.mimeType === 'text/html' && part.body?.data && !html) {
        html = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/plain' && part.body?.data && !text) {
        text = decodeBase64Url(part.body.data);
      }
      if (part.parts && Array.isArray(part.parts)) {
        for (const subPart of part.parts) {
          walk(subPart);
        }
      }
    };

    if (payload?.body?.data) {
      if (payload.mimeType === 'text/html') {
        html = decodeBase64Url(payload.body.data);
      } else {
        text = decodeBase64Url(payload.body.data);
      }
    }

    if (payload?.parts) {
      for (const part of payload.parts) {
        walk(part);
      }
    }

    return { html, text };
  }

  // Helper to recursively extract all attachments (documents, images, PDFs, etc.) from Gmail message payload
  private extractGmailAttachments(payload: any): Array<{
    attachmentId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    contentId?: string;
    isInline: boolean;
    base64Data?: string;
    fileUrl?: string;
  }> {
    const list: Array<any> = [];
    let counter = 1;

    const walk = (part: any) => {
      if (!part) return;

      const headers: Array<{ name: string; value: string }> = part.headers || [];
      const getHeader = (name: string): string => {
        const h = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      };

      const disposition = getHeader('Content-Disposition') || '';
      const contentIdRaw = getHeader('Content-ID');
      const contentId = contentIdRaw ? contentIdRaw.replace(/[<>]/g, '').trim() : undefined;

      let filename = part.filename || '';
      if (!filename && disposition) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match) filename = match[1].trim();
      }

      const mimeType = part.mimeType || 'application/octet-stream';
      const hasAttachmentId = Boolean(part.body?.attachmentId);
      const isNamed = Boolean(filename && filename.trim().length > 0);
      const isAttachmentDisp = disposition.toLowerCase().includes('attachment');
      const isInlineDisp = disposition.toLowerCase().includes('inline') || Boolean(contentId);
      const isDocumentOrMedia =
        mimeType.startsWith('image/') ||
        mimeType.startsWith('video/') ||
        mimeType.startsWith('audio/') ||
        mimeType.includes('pdf') ||
        mimeType.includes('msword') ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('presentation') ||
        mimeType.includes('zip') ||
        mimeType.includes('tar') ||
        mimeType.includes('octet-stream');

      const isTextBody = (mimeType === 'text/html' || mimeType === 'text/plain') && !isNamed && !isAttachmentDisp;

      if ((hasAttachmentId || isNamed || isAttachmentDisp || (isInlineDisp && isDocumentOrMedia)) && !isTextBody) {
        const attachmentId = part.body?.attachmentId || (contentId ? `cid_${contentId}` : `inline_${counter++}`);
        const finalName = filename || (contentId ? `inline-${contentId}` : `attachment-${counter}`);
        const size = part.body?.size || 0;

        let base64Data: string | undefined;
        if (part.body?.data) {
          base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
        }

        list.push({
          attachmentId,
          fileName: finalName,
          contentType: mimeType,
          fileSize: size,
          contentId,
          isInline: isInlineDisp,
          base64Data,
        });
      }

      if (part.parts && Array.isArray(part.parts)) {
        for (const subPart of part.parts) {
          walk(subPart);
        }
      }
    };

    if (payload?.parts && Array.isArray(payload.parts)) {
      for (const p of payload.parts) {
        walk(p);
      }
    } else if (payload?.body?.attachmentId || (payload?.filename && payload.filename.length > 0)) {
      walk(payload);
    }

    return list;
  }

  // Fetch attachment binary stream / data for a message (supports Gmail OAuth, stored base64, and files)
  async getAttachment(userId: string, messageId: string, attachmentId: string) {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { account: true },
    });
    if (!message) {
      throw new NotFoundException('Email message not found');
    }

    await this.validateAccountAccess(userId, message.accountId);

    const attachments = (message.attachmentsJson as any[]) || [];
    const meta = attachments.find(
      (a: any) =>
        a.attachmentId === attachmentId ||
        a.id === attachmentId ||
        a.fileName === attachmentId ||
        (a.contentId && a.contentId === attachmentId),
    );

    // 1. If live Gmail message and attachment is stored on Gmail server
    if (
      message.account.provider === EmailProvider.GOOGLE &&
      message.externalMessageId &&
      attachmentId &&
      !attachmentId.startsWith('inline_') &&
      !meta?.base64Data
    ) {
      const validToken = await this.getValidGoogleAccessToken(message.account);
      if (!validToken) {
        throw new BadRequestException('Google authentication expired, please reconnect your Gmail account');
      }

      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.externalMessageId}/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${validToken}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const base64Str = (data.data || '').replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(base64Str, 'base64');
        return {
          buffer,
          contentType: meta?.contentType || 'application/octet-stream',
          fileName: meta?.fileName || 'attachment',
          size: data.size || buffer.length,
        };
      }
    }

    // 2. If attachment has stored base64Data
    if (meta?.base64Data) {
      const cleanBase64 = meta.base64Data.replace(/^data:[^;]+;base64,/, '').replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(cleanBase64, 'base64');
      return {
        buffer,
        contentType: meta.contentType || 'application/octet-stream',
        fileName: meta.fileName || 'attachment',
        size: buffer.length,
      };
    }

    // 3. If external fileUrl (sample or static assets)
    if (meta?.fileUrl && meta.fileUrl.startsWith('http')) {
      try {
        const res = await fetch(meta.fileUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const buffer = Buffer.from(ab);
          return {
            buffer,
            contentType: meta.contentType || 'application/octet-stream',
            fileName: meta.fileName || 'attachment',
            size: buffer.length,
          };
        }
      } catch (err) {
        console.warn('Failed to fetch remote attachment URL:', err);
      }
    }

    throw new NotFoundException('Attachment content could not be located');
  }

  // Live Sync emails from Gmail API into local database
  async syncGmailAccount(account: any): Promise<{ syncedCount: number; requiresReauth?: boolean; error?: string }> {
    if (this.syncingAccounts.has(account.id)) {
      console.log(`Sync already in progress for ${account.emailAddress}, skipping duplicate concurrent run.`);
      return { syncedCount: 0 };
    }
    this.syncingAccounts.add(account.id);

    try {
      const accessToken = await this.getValidGoogleAccessToken(account);
      if (!accessToken) {
        console.warn(`No valid access token available for ${account.emailAddress}`);
        return { syncedCount: 0, requiresReauth: true, error: 'NO_TOKEN' };
      }

      // Fetch latest message IDs from Gmail (filtered by allowed domains if shared group mailbox)
      let listUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500';
      if (account.isShared && account.allowedDomains && account.allowedDomains.length > 0) {
        const cleanList = account.allowedDomains.map((d: string) => d.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
        if (cleanList.length > 0) {
          const qParts = cleanList.map((d: string) => `from:(*@${d}) OR to:(*@${d}) OR from:(*.${d}) OR to:(*.${d})`);
          const qStr = qParts.join(' OR ');
          listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=500&q=${encodeURIComponent(qStr)}`;
        }
      }

      const listRes = await fetch(
        listUrl,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!listRes.ok) {
        const errText = await listRes.text();
        console.error(`Gmail API list messages failed (${listRes.status}):`, errText);

        const isRateLimit = listRes.status === 429 || errText.includes('rateLimitExceeded') || errText.includes('RATE_LIMIT_EXCEEDED') || errText.includes('Quota exceeded');
        const isAuthRevoked = listRes.status === 401 || (listRes.status === 403 && (errText.includes('insufficientPermissions') || errText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')));

        if (isRateLimit) {
          console.warn(`Gmail API rate limited for ${account.emailAddress}. Backing off, NOT requiring reauth.`);
          return { syncedCount: 0, requiresReauth: false, error: 'RATE_LIMIT' };
        }

        if (isAuthRevoked && !account.refreshToken) {
          this.accountReauthNeeded.set(account.id, true);
          return { syncedCount: 0, requiresReauth: true, error: errText };
        }

        return { syncedCount: 0, requiresReauth: false, error: errText };
      }

      this.accountReauthNeeded.delete(account.id);

      const listData = await listRes.json();
      let messageRefs: Array<{ id: string; threadId: string }> = listData.messages || [];

      // Also ensure latest sent messages are fetched from Gmail
      try {
        let sentUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=100';
        if (account.isShared && account.allowedDomains && account.allowedDomains.length > 0) {
          const cleanList = account.allowedDomains.map((d: string) => d.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
          if (cleanList.length > 0) {
            const qParts = cleanList.map((d: string) => `from:(*@${d}) OR to:(*@${d}) OR from:(*.${d}) OR to:(*.${d})`);
            const qStr = qParts.join(' OR ');
            sentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent+(${encodeURIComponent(qStr)})&maxResults=100`;
          }
        }
        const sentRes = await fetch(
          sentUrl,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (sentRes.ok) {
          const sentData = await sentRes.json();
          const sentRefs: Array<{ id: string; threadId: string }> = sentData.messages || [];
          const existingIds = new Set(messageRefs.map((m: any) => m.id));
          for (const sRef of sentRefs) {
            if (!existingIds.has(sRef.id)) {
              messageRefs.push(sRef);
              existingIds.add(sRef.id);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch Gmail sent messages query:', err);
      }

      // Also ensure latest spam messages are fetched from Gmail
      try {
        let spamUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:spam&maxResults=100&includeSpamTrash=true';
        if (account.isShared && account.allowedDomains && account.allowedDomains.length > 0) {
          const cleanList = account.allowedDomains.map((d: string) => d.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
          if (cleanList.length > 0) {
            const qParts = cleanList.map((d: string) => `from:(*@${d}) OR to:(*@${d}) OR from:(*.${d}) OR to:(*.${d})`);
            const qStr = qParts.join(' OR ');
            spamUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:spam+(${encodeURIComponent(qStr)})&maxResults=100&includeSpamTrash=true`;
          }
        }
        const spamRes = await fetch(spamUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (spamRes.ok) {
          const spamData = await spamRes.json();
          const spamRefs: Array<{ id: string; threadId: string }> = spamData.messages || [];
          const existingIds = new Set(messageRefs.map((m: any) => m.id));
          for (const sRef of spamRefs) {
            if (!existingIds.has(sRef.id)) {
              messageRefs.push(sRef);
              existingIds.add(sRef.id);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch Gmail spam messages query:', err);
      }

      if (messageRefs.length === 0) {
        return { syncedCount: 0 };
      }

      // Check which message IDs already exist in the database to prevent duplicate full-payload quota usage
      const existingList = await this.prisma.emailMessage.findMany({
        where: {
          accountId: account.id,
          externalMessageId: { in: messageRefs.map((m) => m.id) },
        },
        select: { externalMessageId: true },
      });
      const existingSet = new Set(existingList.map((m: any) => m.externalMessageId));
      const newRefs = messageRefs.filter((m: any) => !existingSet.has(m.id));

      // If all messages already exist in database, update lastSyncedAt and return without burning quota
      if (newRefs.length === 0) {
        await this.prisma.emailAccount.update({
          where: { id: account.id },
          data: { lastSyncedAt: new Date() },
        });
        return { syncedCount: 0, requiresReauth: false };
      }

      let syncedCount = 0;

      // Fetch message details only for NEW messages in concurrent batches
      const toFetch = newRefs.slice(0, 100);
      const batchSize = 10;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (msgRef) => {
            try {
              const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
              );
              if (!msgRes.ok) return;

              const msgData = await msgRes.json();
              const headers: Array<{ name: string; value: string }> = msgData.payload?.headers || [];

              const getHeader = (name: string): string => {
                const h = headers.find((item) => item.name.toLowerCase() === name.toLowerCase());
                return h ? h.value : '';
              };

              const subject = getHeader('Subject') || '(No Subject)';
              const fromHeader = getHeader('From') || account.emailAddress;
              const toHeader = getHeader('To') || account.emailAddress;
              const ccHeader = getHeader('Cc');
              const dateHeader = getHeader('Date');

              let fromName = '';
              let fromAddress = fromHeader;
              const fromMatch = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
              if (fromMatch) {
                fromName = fromMatch[1].replace(/["']/g, '').trim();
                fromAddress = fromMatch[2].trim();
              } else {
                fromName = fromHeader.split('@')[0];
              }

              const toAddresses = toHeader
                .split(',')
                .map((t: string) => {
                  const m = t.match(/<([^>]+)>/);
                  return m ? m[1].trim() : t.trim();
                })
                .filter(Boolean);

              const ccAddresses = ccHeader
                ? ccHeader
                    .split(',')
                    .map((t: string) => {
                      const m = t.match(/<([^>]+)>/);
                      return m ? m[1].trim() : t.trim();
                    })
                    .filter(Boolean)
                : [];

              const receivedAt = msgData.internalDate
                ? new Date(parseInt(msgData.internalDate, 10))
                : dateHeader
                ? new Date(dateHeader)
                : new Date();

              const labels: string[] = msgData.labelIds || [];
              let folder: EmailFolder = EmailFolder.INBOX;
              if (labels.includes('SENT')) folder = EmailFolder.SENT;
              else if (labels.includes('DRAFT')) folder = EmailFolder.DRAFTS;
              else if (labels.includes('TRASH')) folder = EmailFolder.TRASH;
              else if (labels.includes('SPAM')) folder = EmailFolder.SPAM;
              else if (labels.includes('INBOX')) folder = EmailFolder.INBOX;

              const isStarred = labels.includes('STARRED');
              const isRead = !labels.includes('UNREAD');

              const { html, text } = this.extractGmailBody(msgData.payload);
              const snippet = msgData.snippet || text?.slice(0, 160) || '';

              // Extract all files, documents, and media attachments
              const rawAttachments = this.extractGmailAttachments(msgData.payload);
              const hasAttachments = rawAttachments.length > 0;

              // If group mailbox: double-check that this email matches allowed domains before storing in DB
              if (account.isShared && !this.isEmailAllowed(fromAddress, toAddresses, account.allowedDomains)) {
                return;
              }

              const existing = await this.prisma.emailMessage.findUnique({
                where: {
                  accountId_externalMessageId: {
                    accountId: account.id,
                    externalMessageId: msgData.id,
                  },
                },
              });

              if (existing) {
                // Preserve local read & starred status so background sync never reverts read emails!
                const finalIsRead = existing.isRead ? true : isRead;
                const finalIsStarred = existing.isStarred ? true : isStarred;

                const formattedAttachments = rawAttachments.map((att) => ({
                  ...att,
                  fileUrl: `/api/mail/messages/${existing.id}/attachments/${att.attachmentId}?filename=${encodeURIComponent(att.fileName)}`,
                }));

                let updatedHtml = html || existing.bodyHtml || (text ? `<pre style="white-space: pre-wrap; font-family: inherit;">${text}</pre>` : '');
                if (updatedHtml && rawAttachments.length > 0) {
                  for (const att of rawAttachments) {
                    if (att.contentId) {
                      const inlineUrl = `/api/mail/messages/${existing.id}/attachments/${att.attachmentId}?filename=${encodeURIComponent(att.fileName)}`;
                      updatedHtml = updatedHtml.replace(new RegExp(`cid:${att.contentId}`, 'gi'), inlineUrl);
                    }
                  }
                }

                await this.prisma.emailMessage.update({
                  where: { id: existing.id },
                  data: {
                    folder,
                    subject,
                    fromName,
                    fromAddress,
                    toAddresses,
                    ccAddresses,
                    snippet,
                    bodyHtml: updatedHtml,
                    bodyText: text || existing.bodyText || snippet,
                    isRead: finalIsRead,
                    isStarred: finalIsStarred,
                    hasAttachments,
                    attachmentsJson: formattedAttachments,
                    receivedAt,
                  },
                });
              } else {
                const created = await this.prisma.emailMessage.upsert({
                  where: {
                    accountId_externalMessageId: {
                      accountId: account.id,
                      externalMessageId: msgData.id,
                    },
                  },
                  update: {
                    folder,
                    subject,
                    fromName,
                    fromAddress,
                    toAddresses,
                    ccAddresses,
                    snippet,
                    bodyHtml: html || (text ? `<pre style="white-space: pre-wrap; font-family: inherit;">${text}</pre>` : ''),
                    bodyText: text || snippet,
                    receivedAt,
                  },
                  create: {
                    accountId: account.id,
                    externalMessageId: msgData.id,
                    threadId: msgData.threadId,
                    folder,
                    subject,
                    fromName,
                    fromAddress,
                    toAddresses,
                    ccAddresses,
                    snippet,
                    bodyHtml: html || (text ? `<pre style="white-space: pre-wrap; font-family: inherit;">${text}</pre>` : ''),
                    bodyText: text || snippet,
                    isRead,
                    isStarred,
                    hasAttachments,
                    attachmentsJson: rawAttachments,
                    receivedAt,
                  },
                });

                if (hasAttachments) {
                  let updatedHtml = created.bodyHtml;
                  const formattedAttachments = rawAttachments.map((att) => {
                    const realUrl = `/api/mail/messages/${created.id}/attachments/${att.attachmentId}?filename=${encodeURIComponent(att.fileName)}`;
                    if (att.contentId && updatedHtml) {
                      updatedHtml = updatedHtml.replace(new RegExp(`cid:${att.contentId}`, 'gi'), realUrl);
                    }
                    return {
                      ...att,
                      fileUrl: realUrl,
                    };
                  });

                  await this.prisma.emailMessage.update({
                    where: { id: created.id },
                    data: {
                      attachmentsJson: formattedAttachments,
                      bodyHtml: updatedHtml,
                    },
                  });
                }
              }

              syncedCount++;
            } catch (err) {
              console.warn(`Error processing Gmail message ${msgRef.id}:`, err);
            }
          }),
        );
      }

      // If real live emails were successfully downloaded, clear out placeholder mock emails
      if (syncedCount > 0) {
        await this.prisma.emailMessage.deleteMany({
          where: {
            accountId: account.id,
            externalMessageId: { startsWith: 'msg_' },
          },
        });
      }

      if (account.isShared) {
        await this.purgeNonAllowedMessages(account);
      }
      await this.purgeDuplicateMessages(account.id);

      await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      return { syncedCount };
    } catch (e) {
      console.error(`Gmail live sync error for ${account.emailAddress}:`, e);
      return { syncedCount: 0 };
    } finally {
      this.syncingAccounts.delete(account.id);
    }
  }

  // Helper to get or refresh valid Microsoft Graph access token
  async getValidMicrosoftAccessToken(account: any): Promise<string | null> {
    let token = account.accessToken;
    if (account.refreshToken && process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      try {
        const refreshRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET,
            refresh_token: account.refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          token = refreshData.access_token;
          await this.prisma.emailAccount.update({
            where: { id: account.id },
            data: { accessToken: token, refreshToken: refreshData.refresh_token || account.refreshToken },
          });
          return token;
        }
      } catch (err) {
        console.error('Failed to refresh Microsoft access token:', err);
      }
    }
    return token;
  }

  // Live Sync emails from Microsoft Graph API
  async syncMicrosoftAccount(account: any): Promise<{ syncedCount: number; requiresReauth?: boolean; error?: string }> {
    const accessToken = await this.getValidMicrosoftAccessToken(account);
    if (!accessToken) {
      return { syncedCount: 0, requiresReauth: true, error: 'NO_TOKEN' };
    }

    try {
      const listRes = await fetch(
        'https://graph.microsoft.com/v1.0/me/messages?$top=30&$orderby=receivedDateTime desc',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!listRes.ok) {
        const errText = await listRes.text();
        console.error(`Microsoft Graph API list failed (${listRes.status}):`, errText);
        return { syncedCount: 0, requiresReauth: listRes.status === 401 || listRes.status === 403, error: errText };
      }

      const listData = await listRes.json();
      const messages: any[] = listData.value || [];
      let syncedCount = 0;

      for (const msg of messages) {
        const existing = await this.prisma.emailMessage.findFirst({
          where: { accountId: account.id, externalMessageId: msg.id },
        });

        const fromAddress = msg.from?.emailAddress?.address || account.emailAddress;
        const fromName = msg.from?.emailAddress?.name || fromAddress.split('@')[0];
        const toAddresses = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
        const ccAddresses = (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
        const receivedAt = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date();

        let folder: EmailFolder = EmailFolder.INBOX;
        if (msg.parentFolderId?.toLowerCase().includes('sent') || msg.isDraft) {
          folder = msg.isDraft ? EmailFolder.DRAFTS : EmailFolder.SENT;
        }

        const subject = msg.subject || '(no subject)';
        const snippet = msg.bodyPreview || '';
        const bodyHtml = msg.body?.content || snippet;
        const bodyText = snippet;

        if (account.isShared && !this.isEmailAllowed(fromAddress, toAddresses, account.allowedDomains)) {
          continue;
        }

        if (existing) {
          await this.prisma.emailMessage.update({
            where: { id: existing.id },
            data: {
              subject,
              fromName,
              fromAddress,
              toAddresses,
              ccAddresses,
              snippet,
              bodyHtml,
              bodyText,
              isRead: !!msg.isRead,
              isStarred: !!msg.importance && msg.importance === 'high',
              receivedAt,
            },
          });
        } else {
          await this.prisma.emailMessage.create({
            data: {
              accountId: account.id,
              externalMessageId: msg.id,
              folder,
              subject,
              fromName,
              fromAddress,
              toAddresses,
              ccAddresses,
              snippet,
              bodyHtml,
              bodyText,
              isRead: !!msg.isRead,
              isStarred: !!msg.importance && msg.importance === 'high',
              receivedAt,
            },
          });
        }
        syncedCount++;
      }

      if (syncedCount > 0) {
        await this.prisma.emailMessage.deleteMany({
          where: {
            accountId: account.id,
            externalMessageId: { startsWith: 'msg_' },
          },
        });
      }

      await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      return { syncedCount };
    } catch (e: any) {
      console.error('Microsoft sync error:', e);
      return { syncedCount: 0, error: e.message };
    }
  }

  // Live Sync emails from Custom Corporate IMAP Server
  async syncCustomImapAccount(account: any): Promise<{ syncedCount: number; error?: string }> {
    if (!account.imapHost || !account.imapPassword) {
      return { syncedCount: 0, error: 'IMAP credentials not configured' };
    }

    const client = new ImapFlow({
      host: account.imapHost.trim(),
      port: account.imapPort || 993,
      secure: account.imapTls !== false,
      auth: {
        user: account.imapUser?.trim() || account.emailAddress,
        pass: account.imapPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      let syncedCount = 0;
      try {
        const fetchedItems: any[] = [];
        for await (const msg of client.fetch('1:*', {
          envelope: true,
          source: true,
          flags: true,
          uid: true,
        })) {
          fetchedItems.push(msg);
        }

        // Fetch up to the latest 25 messages in reverse chronological order
        const recentMessages = fetchedItems.slice(-25).reverse();

        for (const msg of recentMessages) {
          const extId = `imap_${account.id}_${msg.uid}`;

          const existing = await this.prisma.emailMessage.findFirst({
            where: {
              accountId: account.id,
              externalMessageId: extId,
            },
          });

          const needsAttachmentRepair =
            existing &&
            existing.hasAttachments &&
            (!existing.attachmentsJson || (Array.isArray(existing.attachmentsJson) && existing.attachmentsJson.length === 0));

          if ((!existing || needsAttachmentRepair) && msg.source) {
            const parsed = await simpleParser(msg.source);
            const fromAddr = parsed.from?.value?.[0]?.address || account.emailAddress;
            const fromName = parsed.from?.value?.[0]?.name || fromAddr.split('@')[0];
            const toAddrs = (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : [])
              .flatMap((t: any) => t.value?.map((v: any) => v.address) || [])
              .filter(Boolean);
            const ccAddrs = (parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : [])
              .flatMap((c: any) => c.value?.map((v: any) => v.address) || [])
              .filter(Boolean);

            if (account.isShared && !this.isEmailAllowed(fromAddr, toAddrs, account.allowedDomains)) {
              continue;
            }

            const attachmentsList: Array<{ fileName: string; fileUrl: string; fileSize: number; contentType: string }> = [];
            if (parsed.attachments && parsed.attachments.length > 0) {
              const uploadsDir = join(process.cwd(), 'uploads');
              if (!existsSync(uploadsDir)) {
                mkdirSync(uploadsDir, { recursive: true });
              }

              for (const att of parsed.attachments) {
                try {
                  const safeExt = extname(att.filename || '') || '.bin';
                  const uniqueFilename = `mail_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`;
                  const filePath = join(uploadsDir, uniqueFilename);
                  if (att.content) {
                    await fsPromises.writeFile(filePath, att.content);
                    attachmentsList.push({
                      fileName: att.filename || 'attachment',
                      fileUrl: `/uploads/${uniqueFilename}`,
                      fileSize: att.size || att.content.length || 0,
                      contentType: att.contentType || 'application/octet-stream',
                    });
                  }
                } catch (attErr) {
                  console.warn('Failed to save email attachment file:', attErr);
                }
              }
            }

            if (existing) {
              if (attachmentsList.length > 0) {
                await this.prisma.emailMessage.update({
                  where: { id: existing.id },
                  data: {
                    hasAttachments: true,
                    attachmentsJson: attachmentsList as any,
                  },
                });
              }
            } else {
              await this.prisma.emailMessage.create({
                data: {
                  accountId: account.id,
                  externalMessageId: extId,
                  folder: EmailFolder.INBOX,
                  fromName,
                  fromAddress: fromAddr,
                  toAddresses: toAddrs.length > 0 ? toAddrs : [account.emailAddress],
                  ccAddresses: ccAddrs,
                  subject: parsed.subject || '(no subject)',
                  snippet: (parsed.text || '').replace(/\s+/g, ' ').trim().slice(0, 120),
                  bodyHtml: parsed.html || `<p>${(parsed.text || '').replace(/\n/g, '<br/>')}</p>`,
                  bodyText: parsed.text || '',
                  isRead: msg.flags?.has('\\Seen') || false,
                  isStarred: msg.flags?.has('\\Flagged') || false,
                  hasAttachments: attachmentsList.length > 0,
                  attachmentsJson: attachmentsList.length > 0 ? (attachmentsList as any) : undefined,
                  receivedAt: parsed.date || new Date(),
                },
              });
              syncedCount++;
            }
          }
        }
      } finally {
        lock.release();
      }

      // Also sync Sent mailbox if available on the IMAP server
      try {
        const mailboxes = await client.list();
        const sentBox = mailboxes.find(
          (mb) =>
            mb.specialUse === '\\Sent' ||
            /^(sent|sent items|sent messages|inbox\.sent)$/i.test(mb.path.trim()) ||
            /\bsent\b/i.test(mb.name),
        );
        if (sentBox) {
          const sentLock = await client.getMailboxLock(sentBox.path);
          try {
            const fetchedSent: any[] = [];
            for await (const msg of client.fetch('1:*', {
              envelope: true,
              source: true,
              flags: true,
              uid: true,
            })) {
              fetchedSent.push(msg);
            }
            const recentSent = fetchedSent.slice(-15).reverse();
            for (const msg of recentSent) {
              const extId = `imap_${account.id}_sent_${msg.uid}`;
              const existing = await this.prisma.emailMessage.findFirst({
                where: { accountId: account.id, externalMessageId: extId },
              });
              if (!existing && msg.source) {
                const parsed = await simpleParser(msg.source);
                const fromAddr = parsed.from?.value?.[0]?.address || account.emailAddress;
                const fromName = parsed.from?.value?.[0]?.name || fromAddr.split('@')[0];
                const toAddrs = (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : [])
                  .flatMap((t: any) => t.value?.map((v: any) => v.address) || [])
                  .filter(Boolean);
                const ccAddrs = (parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : [])
                  .flatMap((c: any) => c.value?.map((v: any) => v.address) || [])
                  .filter(Boolean);

                if (account.isShared && !this.isEmailAllowed(fromAddr, toAddrs, account.allowedDomains)) {
                  continue;
                }

                const attachmentsList: Array<{ fileName: string; fileUrl: string; fileSize: number; contentType: string }> = [];
                if (parsed.attachments && parsed.attachments.length > 0) {
                  const uploadsDir = join(process.cwd(), 'uploads');
                  if (!existsSync(uploadsDir)) {
                    mkdirSync(uploadsDir, { recursive: true });
                  }
                  for (const att of parsed.attachments) {
                    try {
                      const safeExt = extname(att.filename || '') || '.bin';
                      const uniqueFilename = `mail_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`;
                      const filePath = join(uploadsDir, uniqueFilename);
                      if (att.content) {
                        await fsPromises.writeFile(filePath, att.content);
                        attachmentsList.push({
                          fileName: att.filename || 'attachment',
                          fileUrl: `/uploads/${uniqueFilename}`,
                          fileSize: att.size || att.content.length || 0,
                          contentType: att.contentType || 'application/octet-stream',
                        });
                      }
                    } catch (attErr) {
                      console.warn('Failed to save sent email attachment:', attErr);
                    }
                  }
                }

                await this.prisma.emailMessage.create({
                  data: {
                    accountId: account.id,
                    externalMessageId: extId,
                    folder: EmailFolder.SENT,
                    fromName,
                    fromAddress: fromAddr,
                    toAddresses: toAddrs.length > 0 ? toAddrs : ['Recipient'],
                    ccAddresses: ccAddrs,
                    subject: parsed.subject || '(no subject)',
                    snippet: (parsed.text || '').replace(/\s+/g, ' ').trim().slice(0, 120),
                    bodyHtml: parsed.html || `<p>${(parsed.text || '').replace(/\n/g, '<br/>')}</p>`,
                    bodyText: parsed.text || '',
                    isRead: true,
                    isStarred: msg.flags?.has('\\Flagged') || false,
                    isHandled: true,
                    hasAttachments: attachmentsList.length > 0,
                    attachmentsJson: attachmentsList.length > 0 ? (attachmentsList as any) : undefined,
                    receivedAt: parsed.date || new Date(),
                  },
                });
                syncedCount++;
              }
            }
          } finally {
            sentLock.release();
          }
        }
      } catch (sentSyncErr) {
        console.warn('Failed to sync IMAP Sent mailbox:', sentSyncErr);
      }

      await client.logout();

      if (syncedCount > 0) {
        await this.prisma.emailMessage.deleteMany({
          where: {
            accountId: account.id,
            externalMessageId: { startsWith: 'msg_' },
          },
        });
      }

      await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });

      return { syncedCount };
    } catch (err: any) {
      console.error('Custom IMAP sync error:', err);
      return { syncedCount: 0, error: err?.message || 'IMAP_SYNC_ERROR' };
    }
  }

  // Sync / refresh emails for an account (Personal sync by owner, Group mail sync restricted to Admins & Owners)
  async syncAccount(userId: string, accountId: string) {
    const { account, isAdmin } = await this.validateAccountAccess(userId, accountId);

    // If shared group mailbox: strictly enforce that only Admins and Owners can trigger sync
    if (account.isShared) {
      let canSyncGroupMail = isAdmin;
      if (!canSyncGroupMail && (account.workspaceId || account.channelId)) {
        canSyncGroupMail = await this.verifyAdminOrOwnerRole(
          userId,
          account.workspaceId,
          account.channelId,
        );
      }
      if (!canSyncGroupMail) {
        throw new ForbiddenException(
          'Group mail sync can only be triggered by Workspace Admins and Owners (SuperAdmins).'
        );
      }
    }

    if (account.provider === EmailProvider.GOOGLE && account.accessToken) {
      const syncResult = await this.syncGmailAccount(account);
      const updated = await this.prisma.emailAccount.findUnique({
        where: { id: accountId },
      });
      return {
        success: true,
        lastSyncedAt: updated?.lastSyncedAt,
        syncedCount: syncResult.syncedCount,
        requiresReauth: syncResult.requiresReauth,
        error: syncResult.error,
      };
    }

    if (account.provider === EmailProvider.MICROSOFT && account.accessToken) {
      const syncResult = await this.syncMicrosoftAccount(account);
      const updated = await this.prisma.emailAccount.findUnique({
        where: { id: accountId },
      });
      return {
        success: true,
        lastSyncedAt: updated?.lastSyncedAt,
        syncedCount: syncResult.syncedCount,
        requiresReauth: syncResult.requiresReauth,
        error: syncResult.error,
      };
    }

    if (account.provider === EmailProvider.CUSTOM && (account as any).imapHost) {
      const syncResult = await this.syncCustomImapAccount(account);
      const updated = await this.prisma.emailAccount.findUnique({
        where: { id: accountId },
      });
      return {
        success: true,
        lastSyncedAt: updated?.lastSyncedAt,
        syncedCount: syncResult.syncedCount,
        error: syncResult.error,
      };
    }

    const updated = await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date() },
    });

    return { success: true, lastSyncedAt: updated.lastSyncedAt, syncedCount: 0 };
  }

  // Connect via Google Identity Services / One Tap credential
  async handleGoogleOneTap(userId: string, credentialJwt: string) {
    try {
      const parts = credentialJwt.split('.');
      if (parts.length !== 3) {
        throw new BadRequestException('Invalid Google credential format');
      }
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      const email = payload.email?.toLowerCase().trim();
      if (!email) {
        throw new BadRequestException('No email found in Google credential');
      }

      const displayName = payload.name || payload.given_name || email.split('@')[0];

      return this.upsertAccountAndSeed(userId, {
        emailAddress: email,
        provider: EmailProvider.GOOGLE,
        displayName,
        accessToken: credentialJwt,
      });
    } catch (e) {
      console.error('Google One Tap connect error:', e);
      throw new BadRequestException(e instanceof Error ? e.message : 'Failed to verify Google One Tap credential');
    }
  }
}

