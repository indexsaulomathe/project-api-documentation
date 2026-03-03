import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitDocumentDto {
  @ApiProperty({ example: 'cpf-joao.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;
}
