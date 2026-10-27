import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

export enum EmailProvider {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  CUSTOM = 'CUSTOM',
}

export enum EmailFolder {
  INBOX = 'INBOX',
  SENT = 'SENT',
  DRAFTS = 'DRAFTS',
  STARRED = 'STARRED',
  TRASH = 'TRASH',
  ARCHIVE = 'ARCHIVE',
  SPAM = 'SPAM',
}

export const PresenceStatus = {
  ONLINE: 'ONLINE',
  AWAY: 'AWAY',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE',
} as const;
export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  get emailAccount(): any {
    return (this as any)['emailAccount'];
  }

  get emailMessage(): any {
    return (this as any)['emailMessage'];
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL database connected successfully via Prisma');
    } catch (error) {
      this.logger.error('❌ Failed to connect to PostgreSQL database via Prisma', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 PostgreSQL database disconnected');
  }
}
