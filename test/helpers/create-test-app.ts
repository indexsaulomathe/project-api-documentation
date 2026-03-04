import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { seedDocumentTypes } from '../../src/database/seeds/document-types.seed';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await dataSource.runMigrations();
  await seedDocumentTypes(dataSource);

  return { app, dataSource };
}

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `TRUNCATE TABLE documents, employee_document_types, employees, document_types RESTART IDENTITY CASCADE`,
  );
}
