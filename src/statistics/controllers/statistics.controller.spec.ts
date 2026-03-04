import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from '../services/statistics.service';

const mockStats = {
  totalEmployees: 10,
  totalDocumentTypes: 5,
  documents: {
    total: 30,
    pending: 10,
    submitted: 20,
  },
  complianceRate: 66.67,
  mostPendingDocumentTypes: [{ name: 'ASO', pendingCount: 10 }],
  latestSubmissions: [
    {
      employeeName: 'John Doe',
      department: 'Engineering',
      documentTypeName: 'CPF',
      submittedAt: new Date(),
    },
  ],
};

const mockService = {
  getStats: jest.fn(),
};

describe('StatisticsController', () => {
  let controller: StatisticsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: mockService }],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
  });

  describe('GET /statistics', () => {
    it('should call service.getStats() and return statistics', async () => {
      mockService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(mockService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should return complianceRate as 0 when no documents exist', async () => {
      mockService.getStats.mockResolvedValue({
        ...mockStats,
        documents: { total: 0, pending: 0, submitted: 0 },
        complianceRate: 0,
      });

      const result = await controller.getStats();

      expect(result.complianceRate).toBe(0);
    });
  });
});
