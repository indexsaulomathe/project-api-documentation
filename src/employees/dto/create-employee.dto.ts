import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsCpfValid } from '../../common/validators/cpf.validator';

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
    example: '52998224725',
    description: 'CPF with 11 digits, numbers only, valid check digits',
  })
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF must contain exactly 11 numeric digits',
  })
  @IsCpfValid()
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
