import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import { createEmployee, createDocumentType } from '../../helpers/factories';

describe('EmployeeDocumentTypes (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let employeeId: string;
  let documentTypeId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;
    adminToken = testApp.adminToken;
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await clearDatabase(dataSource);
    employeeId = await createEmployee(app, undefined, adminToken);
    documentTypeId = await createDocumentType(app, undefined, adminToken);
  });

  describe('POST /api/v1/employees/:employeeId/document-types', () => {
    it('should link a document type to an employee and return 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId })
        .expect(201);

      expect(body.success).toBe(true);
      expect(body.statusCode).toBe(201);
      expect(body.data.employeeId).toBe(employeeId);
    });

    it('should create a pending document on link', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId });

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('pending');
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .post(
          '/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/document-types',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId })
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 404 when document type not found', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 409 when link already exists', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId });

      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId })
        .expect(409);

      expect(body.statusCode).toBe(409);
    });

    it('should return 400 when documentTypeId is not a valid UUID', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId: 'not-a-uuid' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/employees/:employeeId/document-types', () => {
    it('should return linked document types for employee', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId });

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get(
          '/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/document-types',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/employees/:employeeId/document-types/:documentTypeId', () => {
    it('should unlink and return success message', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId });

      const { body } = await request(app.getHttpServer())
        .delete(
          `/api/v1/employees/${employeeId}/document-types/${documentTypeId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data.message).toBe('Link removed successfully');
    });

    it('should soft-delete pending documents on unlink', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/document-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentTypeId });

      await request(app.getHttpServer())
        .delete(
          `/api/v1/employees/${employeeId}/document-types/${documentTypeId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`);

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data).toHaveLength(0);
    });

    it('should return 404 when link not found', async () => {
      const { body } = await request(app.getHttpServer())
        .delete(
          `/api/v1/employees/${employeeId}/document-types/${documentTypeId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body.statusCode).toBe(404);
    });
  });
});
