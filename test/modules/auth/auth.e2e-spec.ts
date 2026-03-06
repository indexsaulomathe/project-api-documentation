import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearAllTables } from '../../helpers/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await clearAllTables(dataSource);
  });

  describe('POST /api/v1/auth/register (admin only in tests)', () => {
    it('should register an admin user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'Admin@123',
          role: 'admin',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 409 when email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'dup@test.com', password: 'Admin@123', role: 'admin' });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'dup@test.com', password: 'Admin@123', role: 'admin' })
        .expect(409);
    });

    it('should return 400 with invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: '123' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'user@test.com',
        password: 'Passwd@123',
        role: 'admin',
      });
    });

    it('should return tokens on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'Passwd@123' })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 on unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'Passwd@123' })
        .expect(401);
    });

    it('should return 400 with invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-email' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'user@test.com',
        password: 'Passwd@123',
        role: 'admin',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'Passwd@123' });

      refreshToken = loginRes.body.data.refreshToken as string;
    });

    it('should return new tokens on valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should invalidate old refresh token after rotation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      const newRefresh = res.body.data.refreshToken as string;
      expect(newRefresh).not.toBe(refreshToken);

      // Old token should now be invalid
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should return 401 on invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.value' })
        .expect(401);
    });
  });

  describe('Protected endpoints', () => {
    let accessToken: string;

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: 'admin@test.com',
        password: 'Admin@123',
        role: 'admin',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin@123' });

      accessToken = loginRes.body.data.accessToken as string;
    });

    it('should return 401 when accessing protected endpoint without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/employees').expect(401);
    });

    it('should return 200 when accessing protected endpoint with valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 401 with malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employees')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });
});
