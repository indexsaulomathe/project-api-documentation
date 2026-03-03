import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesService } from '../services/document-types.service';
import { CreateDocumentTypeDto } from '../dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';
import { DocumentTypeQueryDto } from '../dto/document-type-query.dto';

const mockDocumentType = {
  id: 'uuid-1',
  name: 'CPF',
  description: 'Cadastro de Pessoa Física',
  isRequired: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockPaginated = {
  data: [mockDocumentType],
  meta: { total: 1, page: 1, lastPage: 1, limit: 10 },
};

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DocumentTypesController', () => {
  let controller: DocumentTypesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentTypesController],
      providers: [{ provide: DocumentTypesService, useValue: mockService }],
    }).compile();

    controller = module.get<DocumentTypesController>(DocumentTypesController);
  });

  describe('POST /', () => {
    it('should call service.create() with DTO and return created document type', async () => {
      const dto: CreateDocumentTypeDto = { name: 'CPF', isRequired: true };
      mockService.create.mockResolvedValue(mockDocumentType);

      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockDocumentType);
    });

    it('should propagate ConflictException when name already exists', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException('Document type name already in use'),
      );

      await expect(controller.create({ name: 'CPF' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('GET /', () => {
    it('should call service.findAll() with query and return paginated data', async () => {
      const query: DocumentTypeQueryDto = { page: 1, limit: 10 };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginated);
    });

    it('should use default values when no query is provided', async () => {
      const query: DocumentTypeQueryDto = {};
      mockService.findAll.mockResolvedValue(mockPaginated);

      await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /:id', () => {
    it('should call service.findOne() and return document type', async () => {
      mockService.findOne.mockResolvedValue(mockDocumentType);

      const result = await controller.findOne('uuid-1');

      expect(mockService.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockDocumentType);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /:id', () => {
    it('should call service.update() with id and partial DTO', async () => {
      const dto: UpdateDocumentTypeDto = { name: 'RG' };
      mockService.update.mockResolvedValue({ ...mockDocumentType, ...dto });

      const result = await controller.update('uuid-1', dto);

      expect(mockService.update).toHaveBeenCalledWith('uuid-1', dto);
      expect(result.name).toBe('RG');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ConflictException when name is already in use', async () => {
      mockService.update.mockRejectedValue(new ConflictException());

      await expect(
        controller.update('uuid-1', { name: 'CPF' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /:id', () => {
    it('should call service.remove() and return success message', async () => {
      mockService.remove.mockResolvedValue({
        message: 'Document type removed successfully',
      });

      const result = await controller.remove('uuid-1');

      expect(mockService.remove).toHaveBeenCalledWith('uuid-1');
      expect(result).toBeDefined();
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
