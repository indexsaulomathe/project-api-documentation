import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import {
  createEmployee,
  createDocumentType,
  linkDocumentType,
} from '../../helpers/factories';

describe('Pendencies (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let employeeId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await clearDatabase(dataSource);
    employeeId = await createEmployee(app);
    const documentTypeId = await createDocumentType(app);
    // Linking creates a pending document automatically
    await linkDocumentType(app, employeeId, documentTypeId);
  });

  describe('GET /api/v1/pendencies', () => {
    it('should return paginated pendencies with meta', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/pendencies')
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('pending');
      expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should filter by employeeId', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/pendencies?employeeId=${employeeId}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('should return empty list when filtering by unknown employeeId', async () => {
      const { body } = await request(app.getHttpServer())
        .get(
          '/api/v1/pendencies?employeeId=a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        )
        .expect(200);

      expect(body.data).toHaveLength(0);
    });

    it('should return 400 when limit exceeds 100', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/pendencies?limit=200')
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 400 when employeeId is not a valid UUID', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/pendencies?employeeId=not-a-uuid')
        .expect(400);

      expect(body.statusCode).toBe(400);
    });
  });
});
