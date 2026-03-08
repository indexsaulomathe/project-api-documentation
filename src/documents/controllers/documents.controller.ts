import {
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ACCEPTED_TYPES_LABEL,
  ALLOWED_MIME_TYPES_REGEX,
  MAX_UPLOAD_BYTES,
} from '../dto/allowed-mime-types.enum';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentsService } from '../services/documents.service';
import { IUploadedFile } from '../interfaces/uploaded-file.interface';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { DocumentStatus } from '../entities/document.entity';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../auth/entities/user.entity';

@ApiBearerAuth()
@ApiTags('documents')
@Controller({ path: 'employees', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':employeeId/documents/:documentTypeId')
  @Throttle({ upload: {} })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: ACCEPTED_TYPES_LABEL,
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a document file (creates a new version)' })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and new version created',
  })
  @ApiResponse({
    status: 400,
    description: `Invalid file type or size. Accepted: ${ACCEPTED_TYPES_LABEL}`,
  })
  @ApiNotFoundResponse({
    description: 'Employee not found or no active document',
  })
  submit(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentTypeId', ParseUUIDPipe) documentTypeId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
          new FileTypeValidator({
            fileType: ALLOWED_MIME_TYPES_REGEX,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: IUploadedFile,
  ) {
    return this.documentsService.submit(employeeId, documentTypeId, file);
  }

  @Get(':employeeId/documents/:documentTypeId/download')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get a signed download URL for the active document',
  })
  @ApiResponse({ status: 200, description: 'Signed URL (valid 1 hour)' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee, document, or file not found' })
  download(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentTypeId', ParseUUIDPipe) documentTypeId: string,
  ) {
    return this.documentsService.getDownloadUrl(employeeId, documentTypeId);
  }

  @Get(':employeeId/documents/:documentTypeId/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get paginated version history for a document type',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated versions ordered by version DESC',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Employee not found or no history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getHistory(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentTypeId', ParseUUIDPipe) documentTypeId: string,
    @Query() query: PaginationDto,
  ) {
    return this.documentsService.getHistory(employeeId, documentTypeId, query);
  }

  @Get(':employeeId/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List active documents for an employee' })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
