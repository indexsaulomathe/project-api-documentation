import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { seedDocumentTypes } from '../../src/database/seeds/document-types.seed';
import { StorageService } from '../../src/storage/storage.service';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
  adminToken: string;
}

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'Admin@Test1';

const mockStorageService = {
  buildKey: (
    employeeId: string,
    documentTypeId: string,
    version: number,
    fileName: string,
  ) => `${employeeId}/${documentTypeId}/v${version}/${fileName}`,
  upload: jest.fn().mockResolvedValue('mock-key'),
  getSignedDownloadUrl: jest.fn().mockResolvedValue('https://signed.url/file'),
  delete: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
};

export async function createTestApp(): Promise<TestApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StorageService)
    .useValue(mockStorageService)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await dataSource.runMigrations();
  await seedDocumentTypes(dataSource);

  // Ensure a clean admin user for each test suite
  await dataSource.query(`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);

  // Register default admin user for tests
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  const adminToken = loginRes.body.data.accessToken as string;

  return { app, dataSource, adminToken };
}

export async function clearDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `TRUNCATE TABLE documents, employee_document_types, employees, document_types RESTART IDENTITY CASCADE`,
  );
}

/** Use only in auth E2E tests that manage their own users. */
export async function clearAllTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `TRUNCATE TABLE documents, employee_document_types, employees, document_types, users RESTART IDENTITY CASCADE`,
  );
}

export { ADMIN_EMAIL, ADMIN_PASSWORD };
