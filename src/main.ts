import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.APP_PORT ?? 3000;

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Employee Documentation API')
    .setDescription('API for employee document management')
    .setVersion('1.0')
    .addTag('employees', 'Employee management')
    .addTag('document-types', 'Document types')
    .addTag('documents', 'Document submission and versioning')
    .addTag('pending', 'Pending documents')
    .addTag('stats', 'General statistics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  Logger.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
  );

  Logger.log(`Server is running on http://localhost:${port}/api`);
}

bootstrap();
