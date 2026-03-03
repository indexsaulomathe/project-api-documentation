import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Employee } from '../employees/entities/employee.entity';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Employee])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
