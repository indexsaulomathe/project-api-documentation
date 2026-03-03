import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from '../services/documents.service';
import { SubmitDocumentDto } from '../dto/submit-document.dto';
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
  submittedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPaginated = {
  data: [mockDocument],
  meta: { total: 1, page: 1, lastPage: 1, limit: 10 },
};

const mockService = {
  submit: jest.fn(),
  findByEmployee: jest.fn(),
};

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
    it('should call service.submit() and return the new document version', async () => {
      const dto: SubmitDocumentDto = { fileName: 'cpf-joao.pdf' };
      mockService.submit.mockResolvedValue(mockDocument);

      const result = await controller.submit('emp-uuid', 'dt-uuid', dto);

      expect(mockService.submit).toHaveBeenCalledWith(
        'emp-uuid',
        'dt-uuid',
        dto,
      );
      expect(result).toEqual(mockDocument);
    });

    it('should propagate NotFoundException when employee not found', async () => {
      mockService.submit.mockRejectedValue(new NotFoundException());

      await expect(
        controller.submit('non-existent', 'dt-uuid', { fileName: 'f.pdf' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException when no active document found', async () => {
      mockService.submit.mockRejectedValue(new NotFoundException());

      await expect(
        controller.submit('emp-uuid', 'dt-uuid', { fileName: 'f.pdf' }),
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
