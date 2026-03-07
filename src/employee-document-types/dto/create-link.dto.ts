import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({ example: 'uuid-document-type' })
  @IsUUID()
  documentTypeId: string;
}
