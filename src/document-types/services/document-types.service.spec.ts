import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentTypesService } from './document-types.service';
import { DocumentType } from '../entities/document-type.entity';

const mockDocumentType: Partial<DocumentType> = {
  id: 'uuid-1',
  name: 'CPF',
  description: 'Cadastro de Pessoa Física',
  isRequired: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('DocumentTypesService', () => {
  let service: DocumentTypesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentTypesService,
        {
          provide: getRepositoryToken(DocumentType),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentTypesService>(DocumentTypesService);
  });

  describe('create()', () => {
    it('should save and return the created document type', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockDocumentType);
      mockRepository.save.mockResolvedValue(mockDocumentType);

      const result = await service.create({ name: 'CPF', isRequired: true });

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockDocumentType);
    });

    it('should throw ConflictException when name already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockDocumentType);

      await expect(service.create({ name: 'CPF' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll()', () => {
    interface QbMock {
      where: jest.Mock;
      andWhere: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getManyAndCount: jest.Mock;
    }

    const buildQbMock = (data: unknown[], total: number): QbMock => {
      const qb: QbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, total]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should return paginated result with meta', async () => {
      buildQbMock([mockDocumentType], 1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        lastPage: 1,
        limit: 10,
      });
    });

    it('should apply name filter when provided', async () => {
      const qb = buildQbMock([mockDocumentType], 1);

      await service.findAll({ page: 1, limit: 10, name: 'cpf' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('name'),
        { name: '%cpf%' },
      );
    });

    it('should apply isRequired filter when provided', async () => {
      const qb = buildQbMock([mockDocumentType], 1);

      await service.findAll({ page: 1, limit: 10, isRequired: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('isRequired'),
        { isRequired: true },
      );
    });

    it('should return only records without deletedAt', async () => {
      const qb = buildQbMock([mockDocumentType], 1);

      await service.findAll({ page: 1, limit: 10 });

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('deletedAt'),
      );
    });
  });

  describe('findOne()', () => {
    it('should return document type when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockDocumentType);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(mockDocumentType);
    });

    it('should throw NotFoundException when document type not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when document type is soft-deleted', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('deleted-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    it('should update only provided fields', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(mockDocumentType)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue({
        ...mockDocumentType,
        name: 'RG',
      });

      const result = await service.update('uuid-1', { name: 'RG' });

      expect(result.name).toBe('RG');
    });

    it('should throw NotFoundException when document type does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'RG' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when name belongs to another document type', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(mockDocumentType)
        .mockResolvedValueOnce({ id: 'uuid-2', name: 'RG' });

      await expect(service.update('uuid-1', { name: 'RG' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove()', () => {
    it('should call softDelete() with correct ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockDocumentType);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('uuid-1');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException when document type does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
