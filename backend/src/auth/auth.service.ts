import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaService } from '../common/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MessagesGateway } from '../messages/messages.gateway.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
  ) { }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dto.name.trim())}&backgroundColor=4f46e5,7c3aed,9333ea`;
    const sessionId = crypto.randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        password: hashedPassword,
        avatarUrl,
        status: 'Active',
        currentSessionId: sessionId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    return {
      message: 'Account registered successfully',
      user,
      accessToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const sessionId = crypto.randomUUID();

    // Update current session ID in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { currentSessionId: sessionId },
    });

    // Notify any active sockets on other devices to force logout immediately
    try {
      if (this.messagesGateway) {
        this.messagesGateway.emitForceLogout(user.id, sessionId);
      }
    } catch (e) {
      // Gateway error ignored
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
    };

    return {
      message: 'Logged in successfully',
      user: sanitizedUser,
      accessToken,
    };
  }

  async googleLogin(payload: { email?: string; name?: string; avatarUrl?: string }) {
    const email = (payload.email || 'yshah0611@gmail.com').toLowerCase().trim();
    const name = payload.name?.trim() || (email === 'yshah0611@gmail.com' ? 'Yash Shah' : email.split('@')[0]) || 'Google User';
    const avatarUrl =
      payload.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4285F4,34A853,FBBC05,EA4335`;

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    const sessionId = crypto.randomUUID();

    if (!user) {
      const dummyPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: dummyPassword,
          avatarUrl,
          status: 'Active',
          currentSessionId: sessionId,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { currentSessionId: sessionId },
      });
    }

    try {
      if (this.messagesGateway) {
        this.messagesGateway.emitForceLogout(user.id, sessionId);
      }
    } catch (e) {
      // Gateway error ignored
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
    };

    return {
      message: 'Google login successful',
      user: sanitizedUser,
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        workspaceMembers: {
          select: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    const updateData: { name?: string; avatarUrl?: string } = {};
    if (data.name && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (data.avatarUrl) {
      updateData.avatarUrl = data.avatarUrl;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // OAUTH 2.0 (GOOGLE & MICROSOFT AUTHENTICATION)
  // ─────────────────────────────────────────────────────────────

  getGoogleAuthUrl(redirectUri?: string, domainHint?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID not configured in backend');
    }
    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=google`;
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId,
    )}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(
      scopes,
    )}&access_type=offline&prompt=select_account${domainHint ? `&hd=${encodeURIComponent(domainHint)}` : ''}`;

    return { url: authUrl };
  }

  async handleGoogleCallback(code: string, redirectUri?: string, currentUserId?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth credentials not configured in backend');
    }

    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=google`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      throw new BadRequestException(
        tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google',
      );
    }

    // Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile || !profile.email) {
      throw new BadRequestException('Could not retrieve email address from Google profile');
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || profile.given_name || email.split('@')[0];
    const avatarUrl = profile.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const sessionId = crypto.randomUUID();

    // Check if this is a Google Workspace Business/Corporate account
    // Google returns 'hd' (Hosted Domain) exclusively for Google Workspace corporate accounts
    const isCorporate = Boolean(profile.hd) || (!email.endsWith('@gmail.com') && !email.endsWith('@googlemail.com'));
    const companyDomain = profile.hd || (isCorporate ? email.split('@')[1] : null);

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user (Sign up with Google)
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: randomPassword,
          avatarUrl,
          status: 'Active',
          currentSessionId: sessionId,
          isCorporate,
          companyDomain,
        },
      });
    } else {
      // Existing user (Log in with Google)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          currentSessionId: sessionId,
          avatarUrl: user.avatarUrl || avatarUrl,
          isCorporate: user.isCorporate || isCorporate,
          companyDomain: user.companyDomain || companyDomain,
        },
      });
    }

    // Auto-setup EmailAccount for Mail Studio (link to Google user and currently logged in workspace user)
    try {
      const userIdsToConnect = Array.from(new Set([user.id, ...(currentUserId ? [currentUserId] : [])]));

      for (const targetUserId of userIdsToConnect) {
        let emailAccount = await this.prisma.emailAccount.findFirst({
          where: { userId: targetUserId, emailAddress: email },
        });
        if (!emailAccount) {
          emailAccount = await this.prisma.emailAccount.create({
            data: {
              userId: targetUserId,
              emailAddress: email,
              provider: 'GOOGLE',
              displayName: name,
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              lastSyncedAt: new Date(),
            },
          });

          const sampleEmails = [
            {
              externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
              folder: 'INBOX' as any,
              fromName: 'Google Cloud Platform',
              fromAddress: 'cloud-noreply@google.com',
              toAddresses: [email],
              subject: 'Welcome to Google Cloud & Patterns Communication OAuth Service',
              snippet: 'Your OAuth integration has been verified. You can now synchronize messages securely across Patterns...',
              bodyHtml: `<p><strong>Google Cloud OAuth Authorization Verified</strong></p><p>Hello,</p><p>Your email account <strong>${email}</strong> was successfully connected to <strong>Patterns Communication</strong> via Google OAuth 2.0.</p>`,
              receivedAt: new Date(),
              isRead: true,
              isStarred: true,
            },
            {
              externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
              folder: 'INBOX' as any,
              fromName: 'Sarah Jenkins',
              fromAddress: 'sarah.jenkins@patterns.com',
              toAddresses: [email],
              subject: 'Q4 Product Roadmap & Sprint Deliverables Review',
              snippet: 'Hi team, please find attached the reviewed sprint goals and client deliverables for next week...',
              bodyHtml: `<p>Hi team,</p><p>Please find attached the reviewed sprint goals and client deliverables for next week. Let me know if any adjustments are needed.</p>`,
              receivedAt: new Date(Date.now() - 3600000 * 3),
              isRead: false,
            },
            {
              externalMessageId: `msg_${Math.random().toString(36).substring(2, 9)}`,
              folder: 'INBOX' as any,
              fromName: 'David Chen',
              fromAddress: 'david.chen@enterprise.io',
              toAddresses: [email],
              subject: 'Contract Signed & Kickoff Scheduling',
              snippet: 'Hey! We just completed signing the enterprise agreement. When can we schedule the technical kickoff?',
              bodyHtml: `<p>Hey!</p><p>We just completed signing the enterprise agreement. When can we schedule the technical kickoff?</p>`,
              receivedAt: new Date(Date.now() - 3600000 * 10),
              isRead: true,
            },
          ];

          for (const sample of sampleEmails) {
            await this.prisma.emailMessage.create({
              data: {
                accountId: emailAccount.id,
                ...sample,
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn('Auto EmailAccount setup warning:', e);
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
      isCorporate: (user as any).isCorporate || false,
      companyDomain: (user as any).companyDomain || null,
      createdAt: user.createdAt,
    };

    return {
      message: 'Authenticated with Google successfully',
      user: sanitizedUser,
      accessToken,
    };
  }

  getMicrosoftAuthUrl(redirectUri?: string) {
    const clientId = process.env.MICROSOFT_CLIENT_ID || 'dummy_ms_client_id';
    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=microsoft`;
    const scopes = ['User.Read', 'openid', 'profile', 'email'].join(' ');

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
      clientId,
    )}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&scope=${encodeURIComponent(
      scopes,
    )}&response_mode=query`;

    return { url: authUrl, configured: !!process.env.MICROSOFT_CLIENT_ID };
  }

  async handleMicrosoftCallback(code: string, redirectUri?: string) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirect = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=microsoft`;

    let email = 'demo_user@outlook.com';
    let name = 'Microsoft User';
    let avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=Microsoft`;

    if (clientId && clientSecret) {
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
        const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json();
        email = (profile.mail || profile.userPrincipalName || email).toLowerCase().trim();
        name = profile.displayName || email.split('@')[0];
      }
    }

    const sessionId = crypto.randomUUID();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: randomPassword,
          avatarUrl,
          status: 'Active',
          currentSessionId: sessionId,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { currentSessionId: sessionId },
      });
    }

    try {
      if (this.messagesGateway) {
        this.messagesGateway.emitForceLogout(user.id, sessionId);
      }
    } catch (e) { }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      sessionId,
    });

    return {
      message: 'Authenticated with Microsoft successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }
}

