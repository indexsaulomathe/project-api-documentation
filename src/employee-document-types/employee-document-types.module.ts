import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeDocumentType } from './entities/employee-document-type.entity';
import { Employee } from '../employees/entities/employee.entity';
import { DocumentType } from '../document-types/entities/document-type.entity';
import { EmployeeDocumentTypesService } from './services/employee-document-types.service';
import { EmployeeDocumentTypesController } from './controllers/employee-document-types.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeDocumentType, Employee, DocumentType]),
  ],
  controllers: [EmployeeDocumentTypesController],
  providers: [EmployeeDocumentTypesService],
  exports: [EmployeeDocumentTypesService],
})
export class EmployeeDocumentTypesModule {}
