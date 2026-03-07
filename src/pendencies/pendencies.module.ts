import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/entities/document.entity';
import { PendenciesService } from './services/pendencies.service';
import { PendenciesController } from './controllers/pendencies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [PendenciesController],
  providers: [PendenciesService],
})
export class PendenciesModule {}
