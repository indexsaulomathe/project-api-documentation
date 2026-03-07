import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Employee } from '../entities/employee.entity';

const mockEmployee: Partial<Employee> = {
  id: 'uuid-1',
  name: 'John Doe',
  email: 'john@company.com',
  cpf: '12345678901',
  department: 'Engineering',
  position: 'Developer',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('EmployeesService', () => {
  let service: EmployeesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  describe('create()', () => {
    it('should save and return the created employee', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockEmployee);
      mockRepository.save.mockResolvedValue(mockEmployee);

      const result = await service.create({
        name: 'John Doe',
        email: 'john@company.com',
        cpf: '12345678901',
        department: 'Engineering',
      });

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockEmployee);

      await expect(
        service.create({
          name: 'Other',
          email: 'john@company.com',
          cpf: '00000000000',
          department: 'HR',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when CPF already exists', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockEmployee);

      await expect(
        service.create({
          name: 'Other',
          email: 'other@company.com',
          cpf: '12345678901',
          department: 'HR',
        }),
      ).rejects.toThrow(ConflictException);
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
      buildQbMock([mockEmployee], 1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        lastPage: 1,
        limit: 10,
      });
    });

    it('should apply department filter when provided', async () => {
      const qb = buildQbMock([mockEmployee], 1);

      await service.findAll({ page: 1, limit: 10, department: 'Engineering' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('department'),
        expect.objectContaining({ department: 'Engineering' }),
      );
    });

    it('should apply name filter (partial, case insensitive) when provided', async () => {
      const qb = buildQbMock([mockEmployee], 1);

      await service.findAll({ page: 1, limit: 10, name: 'john' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('name'),
        { name: '%john%' },
      );
    });

    it('should return only records without deletedAt', async () => {
      const qb = buildQbMock([mockEmployee], 1);

      await service.findAll({ page: 1, limit: 10 });

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('deletedAt'),
      );
    });
  });

  describe('findOne()', () => {
    it('should return employee when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when employee is soft-deleted', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('deleted-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    it('should update only provided fields', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue({
        ...mockEmployee,
        name: 'Jane Doe',
      });

      const result = await service.update('uuid-1', { name: 'Jane Doe' });

      expect(result.name).toBe('Jane Doe');
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new email belongs to another employee', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce({ id: 'uuid-2', email: 'taken@company.com' });

      await expect(
        service.update('uuid-1', { email: 'taken@company.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove()', () => {
    it('should call softDelete() with correct ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockEmployee);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('uuid-1');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException when employee does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
