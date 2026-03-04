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
    it('should return zero statistics when database is empty', async () => {
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
    });

    it('should return correct statistics after linking (1 pending, 0 submitted)', async () => {
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
      expect(body.data.complianceRate).toBe(0);
    });

    it('should reflect compliance rate of 100 after document submission', async () => {
      const employeeId = await createEmployee(app);
      const documentTypeId = await createDocumentType(app);
      await linkDocumentType(app, employeeId, documentTypeId);

      await request(app.getHttpServer())
        .post(
          `/api/v1/employees/${employeeId}/documents/${documentTypeId}`,
        )
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
    });
  });
});
