import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmployeeDocumentTypesService } from '../services/employee-document-types.service';
import { CreateLinkDto } from '../dto/create-link.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../auth/entities/user.entity';

@ApiBearerAuth()
@ApiTags('employee-document-types')
@Controller({ path: 'employees', version: '1' })
export class EmployeeDocumentTypesController {
  constructor(
    private readonly employeeDocumentTypesService: EmployeeDocumentTypesService,
  ) {}

  @Post(':employeeId/document-types')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a document type to an employee' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee or document type not found' })
  @ApiConflictResponse({
    description: 'Document type already linked to this employee',
  })
  link(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateLinkDto,
  ) {
    return this.employeeDocumentTypesService.link(
      employeeId,
      dto.documentTypeId,
    );
  }

  @Delete(':employeeId/document-types/:documentTypeId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unlink a document type from an employee' })
  @ApiResponse({ status: 200, description: 'Link removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiNotFoundResponse({
    description: 'Link between employee and document type not found',
  })
  unlink(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentTypeId', ParseUUIDPipe) documentTypeId: string,
  ) {
    return this.employeeDocumentTypesService.unlink(employeeId, documentTypeId);
  }

  @Get(':employeeId/document-types')
  @ApiOperation({ summary: 'List document types linked to an employee' })
  @ApiResponse({ status: 200, description: 'List of linked document types' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  findByEmployee(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.employeeDocumentTypesService.findByEmployee(employeeId);
  }
}
