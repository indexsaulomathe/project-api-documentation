import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  clearDatabase,
  ADMIN_EMAIL,
} from '../../helpers/create-test-app';

const EMPLOYEE_EMAIL = 'employee@test.com';
const EMPLOYEE_PASSWORD = 'Employee@Test1';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let employeeToken: string;
  let adminId: string;
  let employeeUserId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;
    adminToken = testApp.adminToken;

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: EMPLOYEE_EMAIL,
      password: EMPLOYEE_PASSWORD,
      role: 'employee',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD });

    employeeToken = (loginRes.body as { data: { accessToken: string } }).data
      .accessToken;

    const adminMeRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${adminToken}`);
    adminId = (adminMeRes.body as { data: { id: string } }).data.id;

    const employeeMeRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${employeeToken}`);
    employeeUserId = (employeeMeRes.body as { data: { id: string } }).data.id;
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user without sensitive fields', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data.id).toBe(adminId);
      expect(body.data.email).toBe(ADMIN_EMAIL);
      expect(body.data).not.toHaveProperty('passwordHash');
      expect(body.data).not.toHaveProperty('refreshTokenHash');
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should update email of current user', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: 'updated@test.com' })
        .expect(200);

      expect(body.data.email).toBe('updated@test.com');
      expect(body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 409 when email is already taken', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ email: ADMIN_EMAIL })
        .expect(409);

      expect(body.statusCode).toBe(409);
    });

    it('should update password and allow login with new password', async () => {
      const tempEmail = 'temp.password@test.com';
      const tempPassword = 'TempPass@123';
      const newPassword = 'NewPassw@456';

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: tempEmail, password: tempPassword, role: 'employee' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: tempEmail, password: tempPassword });
      const tempToken = (loginRes.body as { data: { accessToken: string } })
        .data.accessToken;

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ password: newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: tempEmail, password: newPassword })
        .expect(200);
    });

    it('should return 400 when payload is invalid', async () => {
      const { body } = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ email: 'x@test.com' })
        .expect(401);
    });
  });

  describe('GET /api/v1/users (admin only)', () => {
    it('should return paginated users without sensitive fields when admin', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.meta).toMatchObject({ page: 1, limit: 10 });
      expect(body.data[0]).not.toHaveProperty('passwordHash');
      expect(body.data[0]).not.toHaveProperty('refreshTokenHash');
    });

    it('should filter by role', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data.every((u: { role: string }) => u.role === 'admin')).toBe(
        true,
      );
    });

    it('should filter by email', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/users?email=${ADMIN_EMAIL}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].email).toBe(ADMIN_EMAIL);
    });

    it('should return 403 when non-admin requests', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(body.statusCode).toBe(403);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });
  });

  describe('GET /api/v1/users/:id (admin only)', () => {
    it('should return user by id when admin', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data.id).toBe(adminId);
      expect(body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 403 when non-admin requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return 404 when user not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body.statusCode).toBe(404);
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path');
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/users/:id/role (admin only)', () => {
    it('should update user role when admin', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(body.data.role).toBe('admin');
      expect(body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 400 when role is invalid', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/users/${employeeUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superuser' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 403 when non-admin requests', async () => {
      const tempEmail = 'temp.role@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: tempEmail, password: 'TempPass@123', role: 'employee' });
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: tempEmail, password: 'TempPass@123' });
      const tempToken = (loginRes.body as { data: { accessToken: string } })
        .data.accessToken;

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminId}/role`)
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('should return 404 when user not found', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(404);
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/not-a-uuid/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/users/:id (admin only)', () => {
    it('should soft delete user when admin', async () => {
      const { body } = await request(app.getHttpServer())
        .delete(`/api/v1/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.success).toBe(true);
    });

    it('should not return deleted user on GET /:id', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app.getHttpServer())
        .get(`/api/v1/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when non-admin requests', async () => {
      const tempEmail = 'temp.delete@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: tempEmail, password: 'TempPass@123', role: 'employee' });
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: tempEmail, password: 'TempPass@123' });
      const tempToken = (loginRes.body as { data: { accessToken: string } })
        .data.accessToken;

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${tempToken}`)
        .expect(403);
    });

    it('should return 404 when user not found', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${employeeUserId}`)
        .expect(401);
    });
  });
});
