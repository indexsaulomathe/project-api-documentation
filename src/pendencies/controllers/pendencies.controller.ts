import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PendenciesService } from '../services/pendencies.service';
import { PendencyQueryDto } from '../dto/pendency-query.dto';

@ApiBearerAuth()
@ApiTags('pendencies')
@Controller({ path: 'pendencies', version: '1' })
export class PendenciesController {
  constructor(private readonly pendenciesService: PendenciesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all pending documents across employees',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending documents',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  findAll(@Query() query: PendencyQueryDto) {
    return this.pendenciesService.findAll(query);
  }
}
