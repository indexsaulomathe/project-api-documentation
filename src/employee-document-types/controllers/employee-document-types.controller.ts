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
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmployeeDocumentTypesService } from '../services/employee-document-types.service';
import { CreateLinkDto } from '../dto/create-link.dto';

@ApiTags('employee-document-types')
@Controller({ path: 'employees', version: '1' })
export class EmployeeDocumentTypesController {
  constructor(
    private readonly employeeDocumentTypesService: EmployeeDocumentTypesService,
  ) {}

  @Post(':employeeId/document-types')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a document type to an employee' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
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
  @ApiOperation({ summary: 'Unlink a document type from an employee' })
  @ApiResponse({ status: 200, description: 'Link removed successfully' })
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
