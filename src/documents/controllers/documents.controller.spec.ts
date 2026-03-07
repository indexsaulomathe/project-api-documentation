import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { ThrottlerModule } from '@nestjs/throttler';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from '../services/documents.service';
import { IUploadedFile } from '../interfaces/uploaded-file.interface';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { DocumentStatus } from '../entities/document.entity';

const mockDocument = {
  id: 'doc-uuid',
  employeeId: 'emp-uuid',
  documentTypeId: 'dt-uuid',
  version: 2,
  isActive: true,
  status: DocumentStatus.SUBMITTED,
  fileName: 'cpf-joao.pdf',
  storageKey: 'emp-uuid/dt-uuid/v2/cpf-joao.pdf',
  submittedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPaginated = {
  data: [mockDocument],
  meta: { total: 1, page: 1, lastPage: 1, limit: 10 },
};

const mockFile: IUploadedFile = {
  originalname: 'cpf-joao.pdf',
  mimetype: 'application/pdf',
  buffer: Buffer.from('pdf content'),
};

const mockService = {
  submit: jest.fn(),
  findByEmployee: jest.fn(),
  getHistory: jest.fn(),
  getDownloadUrl: jest.fn(),
};

// Valid UUIDs for pipe integration tests
const EMP_UUID = '12345678-1234-1234-1234-123456789012';
const DT_UUID = '12345678-1234-1234-1234-123456789013';

// ─── Unit tests (pipe bypassed — method called directly) ────────────────────

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: mockService }],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  describe('POST /employees/:employeeId/documents/:documentTypeId', () => {
    it('should call service.submit() with the file and return the new document version', async () => {
      mockService.submit.mockResolvedValue(mockDocument);

      const result = await controller.submit('emp-uuid', 'dt-uuid', mockFile);

      expect(mockService.submit).toHaveBeenCalledWith(
        'emp-uuid',
        'dt-uuid',
        mockFile,
      );
      expect(result).toEqual(mockDocument);
    });

    it('should propagate NotFoundException when employee not found', async () => {
      mockService.submit.mockRejectedValue(new NotFoundException());

      await expect(
        controller.submit('non-existent', 'dt-uuid', mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException when no active document found', async () => {
      mockService.submit.mockRejectedValue(new NotFoundException());

      await expect(
        controller.submit('emp-uuid', 'dt-uuid', mockFile),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /employees/:employeeId/documents/:documentTypeId/download', () => {
    it('should return a signed download URL', async () => {
      const signedUrl = 'https://minio.example.com/file?token=abc';
      mockService.getDownloadUrl.mockResolvedValue(signedUrl);

      const result = await controller.download('emp-uuid', 'dt-uuid');

      expect(mockService.getDownloadUrl).toHaveBeenCalledWith(
        'emp-uuid',
        'dt-uuid',
      );
      expect(result).toBe(signedUrl);
    });

    it('should propagate NotFoundException when document has no file', async () => {
      mockService.getDownloadUrl.mockRejectedValue(new NotFoundException());

      await expect(controller.download('emp-uuid', 'dt-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('GET /employees/:employeeId/documents/:documentTypeId/history', () => {
    it('should call service.getHistory() with pagination and return paginated result', async () => {
      const paginated = {
        data: [
          { ...mockDocument, version: 2, isActive: true },
          { ...mockDocument, id: 'doc-v1', version: 1, isActive: false },
        ],
        meta: { total: 2, page: 1, lastPage: 1, limit: 10 },
      };
      mockService.getHistory.mockResolvedValue(paginated);

      const result = await controller.getHistory('emp-uuid', 'dt-uuid', {
        page: 1,
        limit: 10,
      });

      expect(mockService.getHistory).toHaveBeenCalledWith(
        'emp-uuid',
        'dt-uuid',
        {
          page: 1,
          limit: 10,
        },
      );
      expect(result).toEqual(paginated);
    });

    it('should propagate NotFoundException when no history found', async () => {
      mockService.getHistory.mockRejectedValue(new NotFoundException());

      await expect(
        controller.getHistory('emp-uuid', 'dt-uuid', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /employees/:employeeId/documents', () => {
    it('should call service.findByEmployee() and return paginated documents', async () => {
      const query: DocumentQueryDto = { page: 1, limit: 10 };
      mockService.findByEmployee.mockResolvedValue(mockPaginated);

      const result = await controller.findByEmployee('emp-uuid', query);

      expect(mockService.findByEmployee).toHaveBeenCalledWith(
        'emp-uuid',
        query,
      );
      expect(result).toEqual(mockPaginated);
    });

    it('should apply status filter when provided', async () => {
      const query: DocumentQueryDto = {
        page: 1,
        limit: 10,
        status: DocumentStatus.SUBMITTED,
      };
      mockService.findByEmployee.mockResolvedValue(mockPaginated);

      await controller.findByEmployee('emp-uuid', query);

      expect(mockService.findByEmployee).toHaveBeenCalledWith(
        'emp-uuid',
        query,
      );
    });

    it('should propagate NotFoundException when employee not found', async () => {
      mockService.findByEmployee.mockRejectedValue(new NotFoundException());

      await expect(
        controller.findByEmployee('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

// ─── Integration tests (full HTTP pipeline — ParseFilePipe is active) ────────

describe('DocumentsController — file upload pipe validation', () => {
  let httpApp: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockService.submit.mockResolvedValue(mockDocument);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'upload', ttl: 60000, limit: 100 },
            { name: 'global', ttl: 60000, limit: 100 },
          ],
        }),
      ],
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: mockService }],
    }).compile();

    httpApp = module.createNestApplication();
    await httpApp.init();
  });

  afterEach(async () => {
    await httpApp.close();
  });

  const uploadUrl = () => `/employees/${EMP_UUID}/documents/${DT_UUID}`;

  it('should reject text/plain with 400', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('plain text content'), {
        filename: 'document.txt',
        contentType: 'text/plain',
      })
      .expect(400));

  it('should reject application/zip with 400', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('PK\x03\x04fake-zip'), {
        filename: 'archive.zip',
        contentType: 'application/zip',
      })
      .expect(400));

  it('should reject a file larger than 20 MB with 400', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.alloc(21 * 1024 * 1024), {
        filename: 'large.pdf',
        contentType: 'application/pdf',
      })
      .expect(400));

  it('should return 400 when no file is provided', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .expect(400));

  it('should accept application/pdf', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('%PDF-1.4 content'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
      })
      .expect(201));

  it('should accept image/jpeg', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('\xFF\xD8\xFF fake-jpeg'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201));

  it('should accept image/png', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('\x89PNG fake-png'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201));

  it('should accept image/webp', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('RIFFfakeWEBP'), {
        filename: 'photo.webp',
        contentType: 'image/webp',
      })
      .expect(201));

  it('should accept image/gif', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('GIF89a fake'), {
        filename: 'image.gif',
        contentType: 'image/gif',
      })
      .expect(201));

  it('should accept application/msword (.doc)', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('\xD0\xCF\x11\xE0 fake-doc'), {
        filename: 'document.doc',
        contentType: 'application/msword',
      })
      .expect(201));

  it('should accept application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('PK fake-docx'), {
        filename: 'document.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201));

  it('should accept application/vnd.ms-excel (.xls)', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('\xD0\xCF\x11\xE0 fake-xls'), {
        filename: 'sheet.xls',
        contentType: 'application/vnd.ms-excel',
      })
      .expect(201));

  it('should accept application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx)', () =>
    request(httpApp.getHttpServer() as http.Server)
      .post(uploadUrl())
      .attach('file', Buffer.from('PK fake-xlsx'), {
        filename: 'sheet.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(201));
});
