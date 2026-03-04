import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import {
  createEmployee,
  createDocumentType,
  linkDocumentType,
} from '../../helpers/factories';

describe('Statistics (e2e)', () => {
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

  describe('GET /api/v1/statistics', () => {
    it('should return zero statistics with empty arrays when database is empty', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/statistics')
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data.totalEmployees).toBe(0);
      expect(body.data.totalDocumentTypes).toBe(0);
      expect(body.data.documents).toMatchObject({
        total: 0,
        pending: 0,
        submitted: 0,
      });
      expect(body.data.complianceRate).toBe(0);
      expect(body.data.mostPendingDocumentTypes).toEqual([]);
      expect(body.data.latestSubmissions).toEqual([]);
    });

    it('should return mostPendingDocumentTypes after linking', async () => {
      const employeeId = await createEmployee(app);
      const documentTypeId = await createDocumentType(app);
      await linkDocumentType(app, employeeId, documentTypeId);

      const { body } = await request(app.getHttpServer())
        .get('/api/v1/statistics')
        .expect(200);

      expect(body.data.totalEmployees).toBe(1);
      expect(body.data.totalDocumentTypes).toBe(1);
      expect(body.data.documents).toMatchObject({
        total: 1,
        pending: 1,
        submitted: 0,
      });
      expect(body.data.mostPendingDocumentTypes).toHaveLength(1);
      expect(body.data.mostPendingDocumentTypes[0]).toMatchObject({
        name: 'CPF',
        pendingCount: 1,
      });
      expect(body.data.latestSubmissions).toEqual([]);
    });

    it('should return latestSubmissions and complianceRate of 100 after submission', async () => {
      const employeeId = await createEmployee(app);
      const documentTypeId = await createDocumentType(app);
      await linkDocumentType(app, employeeId, documentTypeId);

      await request(app.getHttpServer())
        .post(`/api/v1/employees/${employeeId}/documents/${documentTypeId}`)
        .send({ fileName: 'cpf.pdf' });

      const { body } = await request(app.getHttpServer())
        .get('/api/v1/statistics')
        .expect(200);

      expect(body.data.documents).toMatchObject({
        total: 1,
        pending: 0,
        submitted: 1,
      });
      expect(body.data.complianceRate).toBe(100);
      expect(body.data.mostPendingDocumentTypes).toEqual([]);
      expect(body.data.latestSubmissions).toHaveLength(1);
      expect(body.data.latestSubmissions[0]).toMatchObject({
        employeeName: 'John Doe',
        department: 'Engineering',
        documentTypeName: 'CPF',
      });
    });
  });
});
