import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : configService.get<number>('port', 3006);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3000');

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  // Serve static files uploaded locally with range request support
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '1d',
    etag: true,
  }));

  // JSON and URL-encoded body parsing limits
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Set global prefix: /api
  app.setGlobalPrefix('api');

  // CORS configuration
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const server = app.getHttpServer();
  // Disable server timeout to allow streaming multi-gigabyte file transfers
  server.setTimeout(0);
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 TeamFlow Backend API is running on: http://0.0.0.0:${port}/api`);
  logger.log(`🩺 Health check available at: http://localhost:${port}/api/health`);
}
await bootstrap();
