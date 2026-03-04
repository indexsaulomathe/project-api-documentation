import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentsService } from './documents.service';
import { Document, DocumentStatus } from '../entities/document.entity';
import { Employee } from '../../employees/entities/employee.entity';

const mockEmployee = { id: 'emp-uuid', name: 'John Doe', deletedAt: null };

const mockActiveDocument = {
  id: 'doc-uuid',
  employeeId: 'emp-uuid',
  documentTypeId: 'dt-uuid',
  version: 1,
  isActive: true,
  status: DocumentStatus.PENDING,
  fileName: null,
  submittedAt: null,
  deletedAt: null,
};

const mockSubmittedDocument = {
  ...mockActiveDocument,
  id: 'doc-uuid-v2',
  version: 2,
  status: DocumentStatus.SUBMITTED,
  isActive: true,
  fileName: 'cpf-joao.pdf',
  submittedAt: new Date(),
};

interface QueryRunnerMock {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: { save: jest.Mock };
}

const mockQueryRunner: QueryRunnerMock = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: { save: jest.fn() },
};

const mockDataSource = { createQueryRunner: jest.fn() };

const mockDocumentRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockEmployeeRepository = { findOne: jest.fn() };

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('submit()', () => {
    it('should deactivate current doc and create new version in a transaction', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocumentRepository.findOne.mockResolvedValue(mockActiveDocument);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...mockActiveDocument, isActive: false })
        .mockResolvedValueOnce(mockSubmittedDocument);

      const result = await service.submit('emp-uuid', 'dt-uuid', {
        fileName: 'cpf-joao.pdf',
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(mockSubmittedDocument);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.submit('non-existent', 'dt-uuid', { fileName: 'f.pdf' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no active document exists', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocumentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.submit('emp-uuid', 'dt-uuid', { fileName: 'f.pdf' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction and rethrow on error', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocumentRepository.findOne.mockResolvedValue(mockActiveDocument);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.submit('emp-uuid', 'dt-uuid', { fileName: 'f.pdf' }),
      ).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getHistory()', () => {
    it('should return all versions ordered by version DESC', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      const history = [
        { ...mockSubmittedDocument, version: 2, isActive: true },
        { ...mockActiveDocument, version: 1, isActive: false },
      ];
      mockDocumentRepository.find.mockResolvedValue(history);

      const result = await service.getHistory('emp-uuid', 'dt-uuid');

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[1].version).toBe(1);
      expect(mockDocumentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employeeId: 'emp-uuid', documentTypeId: 'dt-uuid' },
          order: { version: 'DESC' },
          withDeleted: true,
        }),
      );
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getHistory('non-existent', 'dt-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no history exists', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocumentRepository.find.mockResolvedValue([]);

      await expect(service.getHistory('emp-uuid', 'dt-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmployee()', () => {
    interface QbMock {
      where: jest.Mock;
      andWhere: jest.Mock;
      leftJoinAndSelect: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getManyAndCount: jest.Mock;
    }

    const buildQbMock = (data: unknown[], total: number): QbMock => {
      const qb: QbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, total]),
      };
      mockDocumentRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should return paginated active documents for employee', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      buildQbMock([mockSubmittedDocument], 1);

      const result = await service.findByEmployee('emp-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        lastPage: 1,
        limit: 10,
      });
    });

    it('should apply status filter when provided', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      const qb = buildQbMock([mockSubmittedDocument], 1);

      await service.findByEmployee('emp-uuid', {
        page: 1,
        limit: 10,
        status: DocumentStatus.SUBMITTED,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        { status: DocumentStatus.SUBMITTED },
      );
    });

    it('should apply documentTypeId filter when provided', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      const qb = buildQbMock([mockSubmittedDocument], 1);

      await service.findByEmployee('emp-uuid', {
        page: 1,
        limit: 10,
        documentTypeId: 'dt-uuid',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('documentTypeId'),
        { documentTypeId: 'dt-uuid' },
      );
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByEmployee('non-existent', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
