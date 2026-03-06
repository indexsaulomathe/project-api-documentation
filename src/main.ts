import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  app.enableShutdownHooks();

  const port = process.env.APP_PORT ?? 3000;

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Employee Documentation API')
    .setDescription('API for employee document management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('employees', 'Employee management')
    .addTag('document-types', 'Document types')
    .addTag('documents', 'Document submission and versioning')
    .addTag('pending', 'Pending documents')
    .addTag('stats', 'General statistics')
    .addTag('auth', 'Authentication')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  Logger.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
  );

  Logger.log(`Server is running on http://localhost:${port}/api`);
}

void bootstrap();
