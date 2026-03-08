import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StatisticsService } from '../services/statistics.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../auth/entities/user.entity';

@ApiBearerAuth()
@ApiTags('statistics')
@Controller({ path: 'statistics', version: '1' })
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get aggregated document statistics' })
  @ApiResponse({
    status: 200,
    description:
      'Returns employee count, document type count, document totals and compliance rate',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getStats() {
    return this.statisticsService.getStats();
  }
}
