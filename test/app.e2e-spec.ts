import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from './helpers/create-test-app';

describe('App (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  it('should return 404 for unknown routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/unknown-route').expect(404);
  });

  it('should apply global prefix and versioning', async () => {
    await request(app.getHttpServer()).get('/employees').expect(404);
  });
});
