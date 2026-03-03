import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeeDocumentTypesService } from './employee-document-types.service';
import { EmployeeDocumentType } from '../entities/employee-document-type.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';

const mockEmployee = {
  id: 'emp-uuid',
  name: 'John Doe',
  deletedAt: null,
};

const mockDocumentType = {
  id: 'dt-uuid',
  name: 'CPF',
  deletedAt: null,
};

const mockLink = {
  id: 'link-uuid',
  employeeId: 'emp-uuid',
  documentTypeId: 'dt-uuid',
  createdAt: new Date(),
  deletedAt: null,
};

interface QueryRunnerMock {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: {
    save: jest.Mock;
    softDelete: jest.Mock;
  };
}

const mockQueryRunner: QueryRunnerMock = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
    softDelete: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn(),
};

const mockEdtRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockEmployeeRepository = {
  findOne: jest.fn(),
};

const mockDocTypeRepository = {
  findOne: jest.fn(),
};

describe('EmployeeDocumentTypesService', () => {
  let service: EmployeeDocumentTypesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeDocumentTypesService,
        {
          provide: getRepositoryToken(EmployeeDocumentType),
          useValue: mockEdtRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
        {
          provide: getRepositoryToken(DocumentType),
          useValue: mockDocTypeRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<EmployeeDocumentTypesService>(
      EmployeeDocumentTypesService,
    );
  });

  describe('link()', () => {
    it('should create link and pending document in a transaction', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockEdtRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockLink)
        .mockResolvedValueOnce({});

      const result = await service.link('emp-uuid', 'dt-uuid');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(mockLink);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(service.link('non-existent', 'dt-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when document type not found', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.link('emp-uuid', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when link already exists', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockEdtRepository.findOne.mockResolvedValue(mockLink);

      await expect(service.link('emp-uuid', 'dt-uuid')).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction and rethrow on error', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockDocTypeRepository.findOne.mockResolvedValue(mockDocumentType);
      mockEdtRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.link('emp-uuid', 'dt-uuid')).rejects.toThrow(
        'DB error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('unlink()', () => {
    it('should soft-delete link and pending documents in a transaction', async () => {
      mockEdtRepository.findOne.mockResolvedValue(mockLink);
      mockQueryRunner.manager.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.unlink('emp-uuid', 'dt-uuid');

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.softDelete).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Link removed successfully' });
    });

    it('should throw NotFoundException when link not found', async () => {
      mockEdtRepository.findOne.mockResolvedValue(null);

      await expect(service.unlink('emp-uuid', 'dt-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction and rethrow on error', async () => {
      mockEdtRepository.findOne.mockResolvedValue(mockLink);
      mockQueryRunner.manager.softDelete.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.unlink('emp-uuid', 'dt-uuid')).rejects.toThrow(
        'DB error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findByEmployee()', () => {
    it('should return linked document types for the employee', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(mockEmployee);
      mockEdtRepository.find.mockResolvedValue([mockLink]);

      const result = await service.findByEmployee('emp-uuid');

      expect(result).toEqual([mockLink]);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(service.findByEmployee('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
