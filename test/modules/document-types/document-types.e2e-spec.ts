import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, clearDatabase } from '../../helpers/create-test-app';
import { DOCUMENT_TYPE_PAYLOAD } from '../../helpers/factories';

describe('DocumentTypes (e2e)', () => {
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

  describe('POST /api/v1/document-types', () => {
    it('should create a document type and return 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD)
        .expect(201);

      expect(body.success).toBe(true);
      expect(body.statusCode).toBe(201);
      expect(body.data.name).toBe(DOCUMENT_TYPE_PAYLOAD.name);
      expect(body.data.id).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send({})
        .expect(400);

      expect(body.statusCode).toBe(400);
    });

    it('should return 409 when name already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD)
        .expect(409);

      expect(body.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/document-types', () => {
    it('should return paginated document types with meta', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .get('/api/v1/document-types')
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
    });

    it('should return 400 when limit exceeds 100', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/document-types?limit=200')
        .expect(400);

      expect(body.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/document-types/:id', () => {
    it('should return document type when found', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .get(`/api/v1/document-types/${created.body.data.id}`)
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data.id).toBe(created.body.data.id);
    });

    it('should return 404 when document type not found', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/v1/document-types/b2c3d4e5-f6a7-8901-bcde-f12345678901')
        .expect(404);

      expect(body.statusCode).toBe(404);
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path');
    });

    it('should return 400 when id is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/document-types/not-a-uuid')
        .expect(400);
    });
  });

  describe('PATCH /api/v1/document-types/:id', () => {
    it('should update and return document type', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .patch(`/api/v1/document-types/${created.body.data.id}`)
        .send({ name: 'RG' })
        .expect(200);

      expect(body.success).toBe(true);
      expect(body.data.name).toBe('RG');
    });

    it('should return 404 when document type not found', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/document-types/b2c3d4e5-f6a7-8901-bcde-f12345678901')
        .send({ name: 'RG' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/document-types/:id', () => {
    it('should soft-delete document type and return success', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD);

      const { body } = await request(app.getHttpServer())
        .delete(`/api/v1/document-types/${created.body.data.id}`)
        .expect(200);

      expect(body.success).toBe(true);
    });

    it('should not return deleted document type on GET', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/document-types')
        .send(DOCUMENT_TYPE_PAYLOAD);

      await request(app.getHttpServer()).delete(
        `/api/v1/document-types/${created.body.data.id}`,
      );

      await request(app.getHttpServer())
        .get(`/api/v1/document-types/${created.body.data.id}`)
        .expect(404);
    });

    it('should return 404 when document type not found', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/document-types/b2c3d4e5-f6a7-8901-bcde-f12345678901')
        .expect(404);
    });
  });
});
