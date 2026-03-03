import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from '../services/statistics.service';

@ApiTags('statistics')
@Controller({ path: 'statistics', version: '1' })
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated document statistics' })
  @ApiResponse({
    status: 200,
    description:
      'Returns employee count, document type count, document totals and compliance rate',
  })
  getStats() {
    return this.statisticsService.getStats();
  }
}
