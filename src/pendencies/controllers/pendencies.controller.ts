import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PendenciesService } from '../services/pendencies.service';
import { PendencyQueryDto } from '../dto/pendency-query.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../auth/entities/user.entity';

@ApiBearerAuth()
@ApiTags('pendencies')
@Controller({ path: 'pendencies', version: '1' })
export class PendenciesController {
  constructor(private readonly pendenciesService: PendenciesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List all pending documents across employees',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending documents',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  findAll(@Query() query: PendencyQueryDto) {
    return this.pendenciesService.findAll(query);
  }
}
