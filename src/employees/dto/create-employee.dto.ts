import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John Doe', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '12345678901',
    description: 'CPF with 11 digits, numbers only',
  })
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF must contain exactly 11 numeric digits',
  })
  cpf: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsString()
  @IsOptional()
  position?: string;
}
