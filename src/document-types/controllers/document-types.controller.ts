import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentTypesService } from '../services/document-types.service';
import { CreateDocumentTypeDto } from '../dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';
import { DocumentTypeQueryDto } from '../dto/document-type-query.dto';

@ApiBearerAuth()
@ApiTags('document-types')
@Controller({ path: 'document-types', version: '1' })
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new document type' })
  @ApiResponse({
    status: 201,
    description: 'Document type created successfully',
  })
  @ApiConflictResponse({ description: 'Document type name already in use' })
  create(@Body() dto: CreateDocumentTypeDto) {
    return this.documentTypesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all document types with pagination and filters',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of document types' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'isRequired', required: false, type: Boolean })
  findAll(@Query() query: DocumentTypeQueryDto) {
    return this.documentTypesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document type by ID' })
  @ApiResponse({ status: 200, description: 'Document type found' })
  @ApiNotFoundResponse({ description: 'Document type not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentTypesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document type' })
  @ApiResponse({
    status: 200,
    description: 'Document type updated successfully',
  })
  @ApiNotFoundResponse({ description: 'Document type not found' })
  @ApiConflictResponse({ description: 'Document type name already in use' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTypeDto,
  ) {
    return this.documentTypesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete document type' })
  @ApiResponse({
    status: 200,
    description: 'Document type removed successfully',
  })
  @ApiNotFoundResponse({ description: 'Document type not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentTypesService.remove(id);
  }
}
