import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentStatus } from '../entities/document.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class DocumentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ example: 'uuid-document-type' })
  @IsOptional()
  @IsUUID()
  documentTypeId?: string;
}
