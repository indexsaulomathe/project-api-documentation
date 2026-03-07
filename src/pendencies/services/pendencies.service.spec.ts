import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PendenciesService } from './pendencies.service';
import {
  Document,
  DocumentStatus,
} from '../../documents/entities/document.entity';

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

const mockDocumentRepository = {
  createQueryBuilder: jest.fn(),
};

describe('PendenciesService', () => {
  let service: PendenciesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendenciesService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
      ],
    }).compile();

    service = module.get<PendenciesService>(PendenciesService);
  });

  describe('findAll()', () => {
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

    it('should return paginated pending documents with employee and documentType', async () => {
      buildQbMock([mockPendingDocument], 1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        lastPage: 1,
        limit: 10,
      });
    });

    it('should filter only PENDING, active, non-deleted documents', async () => {
      const qb = buildQbMock([mockPendingDocument], 1);

      await service.findAll({ page: 1, limit: 10 });

      expect(qb.where).toHaveBeenCalledWith(expect.stringContaining('status'), {
        status: DocumentStatus.PENDING,
      });
    });

    it('should apply employeeId filter when provided', async () => {
      const qb = buildQbMock([mockPendingDocument], 1);

      await service.findAll({ page: 1, limit: 10, employeeId: 'emp-uuid' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('employeeId'),
        { employeeId: 'emp-uuid' },
      );
    });

    it('should apply department filter when provided', async () => {
      const qb = buildQbMock([mockPendingDocument], 1);

      await service.findAll({ page: 1, limit: 10, department: 'Engineering' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('department'),
        { department: 'Engineering' },
      );
    });

    it('should join employee and documentType relations', async () => {
      const qb = buildQbMock([mockPendingDocument], 1);

      await service.findAll({ page: 1, limit: 10 });

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        expect.stringContaining('employee'),
        'employee',
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        expect.stringContaining('documentType'),
        'documentType',
      );
    });

    it('should return empty list when no pendencies exist', async () => {
      buildQbMock([], 0);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.lastPage).toBe(0);
    });
  });
});
