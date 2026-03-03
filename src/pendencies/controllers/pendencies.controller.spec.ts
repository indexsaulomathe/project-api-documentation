import { Test, TestingModule } from '@nestjs/testing';
import { PendenciesController } from './pendencies.controller';
import { PendenciesService } from '../services/pendencies.service';
import { PendencyQueryDto } from '../dto/pendency-query.dto';
import { DocumentStatus } from '../../documents/entities/document.entity';

const mockPendingDocument = {
  id: 'doc-uuid',
  employeeId: 'emp-uuid',
  documentTypeId: 'dt-uuid',
  version: 1,
  isActive: true,
  status: DocumentStatus.PENDING,
  fileName: null,
  submittedAt: null,
  employee: { id: 'emp-uuid', name: 'John Doe', department: 'Engineering' },
  documentType: { id: 'dt-uuid', name: 'CPF', isRequired: true },
};

const mockPaginated = {
  data: [mockPendingDocument],
  meta: { total: 1, page: 1, lastPage: 1, limit: 10 },
};

const mockService = {
  findAll: jest.fn(),
};

describe('PendenciesController', () => {
  let controller: PendenciesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PendenciesController],
      providers: [{ provide: PendenciesService, useValue: mockService }],
    }).compile();

    controller = module.get<PendenciesController>(PendenciesController);
  });

  describe('GET /pendencies', () => {
    it('should call service.findAll() with query and return paginated pendencies', async () => {
      const query: PendencyQueryDto = { page: 1, limit: 10 };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginated);
    });

    it('should use default pagination when no query is provided', async () => {
      const query: PendencyQueryDto = {};
      mockService.findAll.mockResolvedValue(mockPaginated);

      await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });

    it('should apply employeeId filter when provided', async () => {
      const query: PendencyQueryDto = {
        page: 1,
        limit: 10,
        employeeId: 'emp-uuid',
      };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginated);
    });

    it('should apply department filter when provided', async () => {
      const query: PendencyQueryDto = {
        page: 1,
        limit: 10,
        department: 'Engineering',
      };
      mockService.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginated);
    });
  });
});
