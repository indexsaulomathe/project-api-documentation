import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';
import { Document } from '../../documents/entities/document.entity';

interface QbMock {
  select: jest.Mock;
  addSelect: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  getRawMany: jest.Mock;
}

const buildQbMock = (data: unknown[] = []): QbMock => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(data),
});

const mockEmployeeRepository = { count: jest.fn() };
const mockDocTypeRepository = { count: jest.fn() };
const mockDocumentRepository = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDocumentRepository.createQueryBuilder.mockReturnValue(buildQbMock());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
        {
          provide: getRepositoryToken(DocumentType),
          useValue: mockDocTypeRepository,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  describe('getStats()', () => {
    it('should return aggregated statistics with correct counts', async () => {
      mockEmployeeRepository.count.mockResolvedValue(10);
      mockDocTypeRepository.count.mockResolvedValue(5);
      mockDocumentRepository.count
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(20); // submitted

      const result = await service.getStats();

      expect(result.totalEmployees).toBe(10);
      expect(result.totalDocumentTypes).toBe(5);
      expect(result.documents.pending).toBe(10);
      expect(result.documents.submitted).toBe(20);
      expect(result.documents.total).toBe(30);
    });

    it('should calculate complianceRate as percentage of submitted over total', async () => {
      mockEmployeeRepository.count.mockResolvedValue(5);
      mockDocTypeRepository.count.mockResolvedValue(3);
      mockDocumentRepository.count
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(20); // submitted

      const result = await service.getStats();

      // 20 / 30 * 100 = 66.67
      expect(result.complianceRate).toBeCloseTo(66.67, 1);
    });

    it('should return complianceRate of 0 when no documents exist', async () => {
      mockEmployeeRepository.count.mockResolvedValue(0);
      mockDocTypeRepository.count.mockResolvedValue(0);
      mockDocumentRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats();

      expect(result.complianceRate).toBe(0);
      expect(result.documents.total).toBe(0);
    });

    it('should run all queries in parallel', async () => {
      mockEmployeeRepository.count.mockResolvedValue(1);
      mockDocTypeRepository.count.mockResolvedValue(1);
      mockDocumentRepository.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      await service.getStats();

      expect(mockEmployeeRepository.count).toHaveBeenCalledTimes(1);
      expect(mockDocTypeRepository.count).toHaveBeenCalledTimes(1);
      expect(mockDocumentRepository.count).toHaveBeenCalledTimes(2);
    });

    it('should return mostPendingDocumentTypes ordered by pendingCount DESC', async () => {
      mockEmployeeRepository.count.mockResolvedValue(1);
      mockDocTypeRepository.count.mockResolvedValue(1);
      mockDocumentRepository.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      mockDocumentRepository.createQueryBuilder
        .mockReturnValueOnce(
          buildQbMock([
            { name: 'ASO', pendingCount: '3' },
            { name: 'CPF', pendingCount: '1' },
          ]),
        )
        .mockReturnValueOnce(buildQbMock([]));

      const result = await service.getStats();

      expect(result.mostPendingDocumentTypes).toHaveLength(2);
      expect(result.mostPendingDocumentTypes[0]).toEqual({
        name: 'ASO',
        pendingCount: 3,
      });
      expect(result.mostPendingDocumentTypes[1]).toEqual({
        name: 'CPF',
        pendingCount: 1,
      });
    });

    it('should return latestSubmissions with employee and documentType info', async () => {
      mockEmployeeRepository.count.mockResolvedValue(1);
      mockDocTypeRepository.count.mockResolvedValue(1);
      mockDocumentRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const submittedAt = new Date('2024-01-01T10:00:00Z');
      mockDocumentRepository.createQueryBuilder
        .mockReturnValueOnce(buildQbMock([]))
        .mockReturnValueOnce(
          buildQbMock([
            {
              employeeName: 'John Doe',
              department: 'Engineering',
              documentTypeName: 'CPF',
              submittedAt,
            },
          ]),
        );

      const result = await service.getStats();

      expect(result.latestSubmissions).toHaveLength(1);
      expect(result.latestSubmissions[0].employeeName).toBe('John Doe');
      expect(result.latestSubmissions[0].department).toBe('Engineering');
      expect(result.latestSubmissions[0].documentTypeName).toBe('CPF');
    });

    it('should return empty arrays when no data exists', async () => {
      mockEmployeeRepository.count.mockResolvedValue(0);
      mockDocTypeRepository.count.mockResolvedValue(0);
      mockDocumentRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats();

      expect(result.mostPendingDocumentTypes).toEqual([]);
      expect(result.latestSubmissions).toEqual([]);
    });
  });
});
