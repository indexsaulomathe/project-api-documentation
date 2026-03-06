import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(() => app.close());

  it('GET /api/health should return 200 with status UP', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.body.data).toMatchObject({
      status: 'ok',
      info: {
        database: { status: 'up' },
      },
    });
  });

  it('GET /api/health should include details for each indicator', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('info');
    expect(res.body.data).toHaveProperty('error');
    expect(res.body.data).toHaveProperty('details');
  });
});
