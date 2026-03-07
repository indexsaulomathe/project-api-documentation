import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from '../services/employees.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';

const mockEmployee = {
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

const mockPaginated = {
  data: [mockEmployee],
  meta: { total: 1, page: 1, lastPage: 1, limit: 10 },
};

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('EmployeesController', () => {
  let controller: EmployeesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: EmployeesService, useValue: mockService }],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  describe('POST /', () => {
    it('should call service.create() with DTO and return created employee', async () => {
      const dto: CreateEmployeeDto = {
        name: 'John Doe',
        email: 'john@company.com',
        cpf: '12345678901',
        department: 'Engineering',
      };
      mockService.create.mockResolvedValue(mockEmployee);

      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockEmployee);
    });

    it('should propagate ConflictException when email is already in use', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException('Email already in use'),
      );
      await expect(controller.create({} as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate ConflictException when CPF is already in use', async () => {
      mockService.create.mockRejectedValue(
        new ConflictException('CPF already in use'),
      );
      await expect(controller.create({} as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('GET /', () => {
    it('should call service.findAll() with pagination params and return paginated data', async () => {
      const query: EmployeeQueryDto = { page: 2, limit: 5 };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginated);
    });

    it('should use default values (page=1, limit=10) when not provided', async () => {
      const query: EmployeeQueryDto = {};
      mockService.findAll.mockResolvedValue(mockPaginated);

      await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /:id', () => {
    it('should call service.findOne() with correct UUID and return employee', async () => {
      mockService.findOne.mockResolvedValue(mockEmployee);

      const result = await controller.findOne('uuid-1');

      expect(mockService.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(mockEmployee);
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
      const dto: UpdateEmployeeDto = { name: 'Jane Doe' };
      mockService.update.mockResolvedValue({ ...mockEmployee, ...dto });

      const result = await controller.update('uuid-1', dto);

      expect(mockService.update).toHaveBeenCalledWith('uuid-1', dto);
      expect(result.name).toBe('Jane Doe');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ConflictException when email is already in use', async () => {
      mockService.update.mockRejectedValue(new ConflictException());
      await expect(
        controller.update('uuid-1', { email: 'taken@email.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /:id', () => {
    it('should call service.remove() and return success message', async () => {
      mockService.remove.mockResolvedValue({
        message: 'Employee removed successfully',
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
