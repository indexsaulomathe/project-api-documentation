import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';
import { Document } from '../../documents/entities/document.entity';

const mockEmployeeRepository = { count: jest.fn() };
const mockDocTypeRepository = { count: jest.fn() };
const mockDocumentRepository = { count: jest.fn() };

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(async () => {
    jest.clearAllMocks();

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
        .mockResolvedValueOnce(0) // pending
        .mockResolvedValueOnce(0); // submitted

      const result = await service.getStats();

      expect(result.complianceRate).toBe(0);
      expect(result.documents.total).toBe(0);
    });

    it('should run all count queries in parallel', async () => {
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
  });
});
