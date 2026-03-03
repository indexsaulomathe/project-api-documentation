import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentsService } from '../services/documents.service';
import { SubmitDocumentDto } from '../dto/submit-document.dto';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { DocumentStatus } from '../entities/document.entity';

@ApiTags('documents')
@Controller({ path: 'employees', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':employeeId/documents/:documentTypeId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a document (creates a new version)' })
  @ApiResponse({
    status: 201,
    description: 'Document submitted and new version created',
  })
  @ApiNotFoundResponse({
    description: 'Employee not found or no active document',
  })
  submit(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentTypeId', ParseUUIDPipe) documentTypeId: string,
    @Body() dto: SubmitDocumentDto,
  ) {
    return this.documentsService.submit(employeeId, documentTypeId, dto);
  }

  @Get(':employeeId/documents')
  @ApiOperation({ summary: 'List active documents for an employee' })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DocumentStatus })
  @ApiQuery({ name: 'documentTypeId', required: false, type: String })
  findByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: DocumentQueryDto,
  ) {
    return this.documentsService.findByEmployee(employeeId, query);
  }
}
