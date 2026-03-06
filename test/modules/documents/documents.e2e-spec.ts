import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import {
  createEmployee,
  createDocumentType,
  linkDocumentType,
} from '../../helpers/factories';

const PDF_BUF = Buffer.from('%PDF-1.4 test content');

describe('Documents (e2e)', () => {
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
    // Linking creates a pending document automatically (version 1)
    await linkDocumentType(app, employeeId, documentTypeId, adminToken);
  });

  describe('POST /api/v1/employees/:employeeId/documents/:documentTypeId', () => {
    it('should submit a document and return 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'cpf.pdf', contentType: 'application/pdf' })
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
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'cpf-v1.pdf', contentType: 'application/pdf' });

      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'cpf-v2.pdf', contentType: 'application/pdf' })
        .expect(201);

      expect(body.data.version).toBe(3);
    });

    it('should return 400 when no file is provided', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 400 when file type is invalid', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('plain text'), { filename: 'doc.txt', contentType: 'text/plain' })
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .post(
          `/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents/${documentTypeId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'cpf.pdf', contentType: 'application/pdf' })
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 404 when document type is not linked to employee', async () => {
      const unlinkedDocTypeId = await createDocumentType(
        app,
        {
          name: 'RG',
          isRequired: false,
        },
        adminToken,
      );

      const { body } = await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${unlinkedDocTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'rg.pdf', contentType: 'application/pdf' })
        .expect(404);

      expect(body.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/employees/:employeeId/documents/:documentTypeId/history', () => {
    it('should return all versions ordered by version DESC', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'cpf-v2.pdf', contentType: 'application/pdf' });

      const { body } = await request(app.getHttpServer())
        .get(
          `/api/v1/employees/${employeeId}/documents/${documentTypeId}/history`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].version).toBe(2);
      expect(body.data[0].status).toBe('submitted');
      expect(body.data[1].version).toBe(1);
      expect(body.data[1].status).toBe('pending');
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get(
          `/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents/${documentTypeId}/history`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 404 when no history exists for the document type', async () => {
      const unlinkedId = await createDocumentType(
        app,
        {
          name: 'RG',
          isRequired: false,
        },
        adminToken,
      );

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents/${unlinkedId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/employees/:employeeId/documents', () => {
    it('should return paginated documents for employee', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should filter by status', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PDF_BUF, { filename: 'cpf.pdf', contentType: 'application/pdf' });

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents?status=submitted`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('submitted');
    });

    it('should return 404 when employee not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/employees/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body.statusCode).toBe(404);
    });

    it('should return 400 when limit exceeds 100', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/employees/${employeeId}/documents?limit=200`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(body.statusCode).toBe(400);
    });
  });
});
