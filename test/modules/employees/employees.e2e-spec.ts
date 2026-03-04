import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import { EMPLOYEE_PAYLOAD } from '../../helpers/factories';

describe('Employees (e2e)', () => {
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

  describe('POST /api/v1/employees', () => {
    it('should create an employee and return 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD)
        .expect(201);

      expect(body.success).toBe(true);
      expect(body.statusCode).toBe(201);
      expect(body.data.email).toBe(EMPLOYEE_PAYLOAD.email);
      expect(body.data.id).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send({ name: 'John' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 400 when CPF format is invalid', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send({ ...EMPLOYEE_PAYLOAD, cpf: '123' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 400 when CPF check digits are invalid', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send({ ...EMPLOYEE_PAYLOAD, cpf: '12345678901' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 409 when email already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send({ ...EMPLOYEE_PAYLOAD, cpf: '11144477735' })
        .expect(409);

      expect(body.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/employees', () => {
    it('should return paginated employees with meta', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should return 400 when limit exceeds 100', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/employees?limit=200')
        .expect(400);

      expect(body.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/employees/:id', () => {
    it('should return employee when found', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${created.body.data.id}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data.id).toBe(created.body.data.id);
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .expect(404);

      expect(body.statusCode).toBe(404);
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path');
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/employees/not-a-uuid')
        .expect(400);
    });
  });

  describe('PATCH /api/v1/employees/:id', () => {
    it('should update and return employee', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${created.body.data.id}`)
        .send({ name: 'Jane Doe' })
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Jane Doe');
    });

    it('should return 404 when employee not found', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .send({ name: 'Jane' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/employees/:id', () => {
    it('should soft-delete employee and return success', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .delete(`/api/v1/employees/${created.body.data.id}`)
        .expect(200);

      expect(body.success).toBe(true);
    });

    it('should not return deleted employee on GET', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(EMPLOYEE_PAYLOAD);

      await request(app.getHttpServer()).delete(
        `/api/v1/employees/${created.body.data.id}`,
      );

      await request(app.getHttpServer())
        .get(`/api/v1/employees/${created.body.data.id}`)
        .expect(404);
    });

    it('should return 404 when employee not found', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        .expect(404);
    });
  });
});
