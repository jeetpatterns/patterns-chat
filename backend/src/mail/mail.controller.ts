import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { MailService } from './mail.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { EmailProvider } from '../common/prisma.service.js';

@UseGuards(JwtAuthGuard)
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('accounts')
  async getAccounts(
    @CurrentUser() user: { id: string },
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.mailService.getAccounts(user.id, workspaceId);
  }

  @Get('auth/google/url')
  async getGoogleAuthUrl(
    @CurrentUser() user: { id: string },
    @Query('redirectUri') redirectUri?: string,
  ) {
    return this.mailService.getGoogleAuthUrl(user.id, redirectUri);
  }

  @Post('auth/google/callback')
  async handleGoogleCallback(
    @CurrentUser() user: { id: string },
    @Body() body: { code: string; emailAddress?: string; redirectUri?: string; workspaceId?: string; channelId?: string; isShared?: boolean },
  ) {
    return this.mailService.handleGoogleCallback(user.id, body.code, body.redirectUri, body.emailAddress, body.workspaceId, body.channelId, body.isShared);
  }

  @Get('auth/microsoft/url')
  async getMicrosoftAuthUrl(
    @CurrentUser() user: { id: string },
    @Query('redirectUri') redirectUri?: string,
  ) {
    return this.mailService.getMicrosoftAuthUrl(user.id, redirectUri);
  }

  @Post('auth/microsoft/callback')
  async handleMicrosoftCallback(
    @CurrentUser() user: { id: string },
    @Body() body: { code: string; emailAddress?: string; redirectUri?: string; workspaceId?: string; channelId?: string; isShared?: boolean },
  ) {
    return this.mailService.handleMicrosoftCallback(user.id, body.code, body.redirectUri, body.emailAddress, body.workspaceId, body.channelId, body.isShared);
  }

  @Post('accounts/connect')
  async connectAccount(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
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
    return this.mailService.connectAccount(user.id, body);
  }

  @Post('accounts/google-one-tap')
  async handleGoogleOneTap(
    @CurrentUser() user: { id: string },
    @Body('credential') credential: string,
  ) {
    return this.mailService.handleGoogleOneTap(user.id, credential);
  }

  @Delete('accounts/:id')
  async disconnectAccount(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.mailService.disconnectAccount(user.id, id);
  }

  @Post('accounts/:id/sync')
  async syncAccount(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.mailService.syncAccount(user.id, id);
  }

  @Patch('accounts/:id/allowed-domains')
  async updateAllowedDomains(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { allowedDomains: string[] },
  ) {
    return this.mailService.updateAllowedDomains(user.id, id, body.allowedDomains);
  }

  @Get('contacts')
  async getContacts(
    @CurrentUser() user: { id: string },
    @Query('workspaceId') workspaceId?: string,
    @Query('q') query?: string,
  ) {
    return this.mailService.getContacts(user.id, workspaceId, query);
  }

  @Get('messages')
  async getMessages(
    @CurrentUser() user: { id: string },
    @Query('accountId') accountId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('folder') folder?: string,
    @Query('status') status?: 'all' | 'unhandled' | 'done',
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mailService.getMessages(user.id, {
      accountId,
      workspaceId,
      folder,
      status,
      tag,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('messages/:id')
  async getMessageById(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.mailService.getMessageById(user.id, id);
  }

  @Get('messages/:messageId/attachments/:attachmentId')
  async getAttachment(
    @CurrentUser() user: { id: string },
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: any,
  ) {
    const file = await this.mailService.getAttachment(user.id, messageId, attachmentId);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.setHeader('Content-Length', file.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(file.buffer);
  }

  @Patch('messages/:id/read')
  async toggleRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { isRead?: boolean },
  ) {
    return this.mailService.toggleRead(user.id, id, body?.isRead);
  }

  @Patch('messages/:id/handled')
  async toggleHandled(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { isHandled?: boolean },
  ) {
    return this.mailService.toggleHandled(user.id, id, body?.isHandled);
  }

  @Patch('messages/:id/tags')
  async updateTags(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { tags: string[] },
  ) {
    return this.mailService.updateTags(user.id, id, body?.tags || []);
  }

  @Get('tags')
  async getWorkspaceTags(
    @CurrentUser() user: { id: string },
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.mailService.getWorkspaceTags(user.id, workspaceId);
  }

  @Post('tags')
  async createCustomTag(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      workspaceId: string;
      name: string;
      color?: string;
      bg?: string;
      text?: string;
      border?: string;
    },
  ) {
    return this.mailService.createCustomTag(user.id, body);
  }

  @Delete('tags/:id')
  async deleteCustomTag(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.mailService.deleteCustomTag(user.id, id);
  }

  @Patch('messages/:id/star')
  async toggleStar(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.mailService.toggleStar(user.id, id);
  }

  @Patch('messages/:id/folder')
  async moveMessageFolder(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body('folder') folder: string,
  ) {
    return this.mailService.moveMessageFolder(user.id, id, folder as any);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.mailService.deleteMessage(user.id, id);
  }

  @Post('messages/send')
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
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
        attachmentId?: string;
      }>;
    },
  ) {
    return this.mailService.sendMessage(user.id, body);
  }

  @Post('messages/:id/share')
  async shareToChannel(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { channelId: string; note?: string },
  ) {
    return this.mailService.shareToChannel(user.id, id, body.channelId, body.note);
  }
}
