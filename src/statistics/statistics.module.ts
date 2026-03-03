import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { DocumentType } from '../document-types/entities/document-type.entity';
import { Document } from '../documents/entities/document.entity';
import { StatisticsService } from './services/statistics.service';
import { StatisticsController } from './controllers/statistics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, DocumentType, Document])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
