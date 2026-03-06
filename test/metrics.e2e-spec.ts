import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('Metrics (e2e)', () => {
  let app: INestApplication;
  const originalToken = process.env.METRICS_TOKEN;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(() => app.close());

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.METRICS_TOKEN;
    } else {
      process.env.METRICS_TOKEN = originalToken;
    }
  });

  it('GET /api/metrics returns 200 without JWT (public route)', async () => {
    delete process.env.METRICS_TOKEN;

    await request(app.getHttpServer()).get('/api/metrics').expect(200);
  });

  it('GET /api/metrics returns Prometheus text format', async () => {
    delete process.env.METRICS_TOKEN;

    const res = await request(app.getHttpServer())
      .get('/api/metrics')
      .expect(200);

    expect(res.text).toMatch(/^# HELP/m);
  });

  it('GET /api/metrics returns 401 when METRICS_TOKEN is set and no token provided', async () => {
    process.env.METRICS_TOKEN = 'test-secret';

    await request(app.getHttpServer()).get('/api/metrics').expect(401);
  });

  it('GET /api/metrics returns 401 when wrong token is provided', async () => {
    process.env.METRICS_TOKEN = 'test-secret';

    await request(app.getHttpServer())
      .get('/api/metrics')
      .set('metrics-token', 'wrong-token')
      .expect(401);
  });

  it('GET /api/metrics returns 200 when correct token is provided', async () => {
    process.env.METRICS_TOKEN = 'test-secret';

    await request(app.getHttpServer())
      .get('/api/metrics')
      .set('metrics-token', 'test-secret')
      .expect(200);
  });
});
