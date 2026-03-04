import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import {
  createEmployee,
  createDocumentType,
  linkDocumentType,
} from '../../helpers/factories';

describe('Documents (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let employeeId: string;
  let documentTypeId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await clearDatabase(dataSource);
    employeeId = await createEmployee(app);
    documentTypeId = await createDocumentType(app);
    // Linking creates a pending document automatically (version 1)
    await linkDocumentType(app, employeeId, documentTypeId);
  });

  describe('POST /api/v1/employees/:employeeId/documents/:documentTypeId', () => {
    it('should submit a document and return 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .send({ fileName: 'cpf.pdf' })
        .expect(201);

      expect(body.success).toBe(true);
      expect(body.statusCode).toBe(201);
      expect(body.data.status).toBe('submitted');
      expect(body.data.version).toBe(2);
      expect(body.data.fileName).toBe('cpf.pdf');
    });

    it('should increment version on re-submit', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .send({ fileName: 'cpf-v1.pdf' });

      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .send({ fileName: 'cpf-v2.pdf' })
        .expect(201);

      expect(body.data.version).toBe(3);
    });

    it('should return 400 when fileName is missing', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .send({})
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .post(
          `/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents/${documentTypeId}`,
        )
        .send({ fileName: 'cpf.pdf' })
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 404 when document type is not linked to employee', async () => {
      const unlinkedDocTypeId = await createDocumentType(app, {
        name: 'RG',
        isRequired: false,
      });

      const { body } = await request(app.getHttpServer())
        .post(
          `/api/v1/employees/${employeeId}/documents/${unlinkedDocTypeId}`,
        )
        .send({ fileName: 'rg.pdf' })
        .expect(404);

      expect(body.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/employees/:employeeId/documents', () => {
    it('should return paginated documents for employee', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should filter by status', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .send({ fileName: 'cpf.pdf' });

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents?status=submitted`)
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('submitted');
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents')
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 400 when limit exceeds 100', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents?limit=200`)
        .expect(400);

      expect(body.statusCode).toBe(400);
    });
  });
});
