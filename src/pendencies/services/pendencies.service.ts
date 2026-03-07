import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Document,
  DocumentStatus,
} from '../../documents/entities/document.entity';
import { PendencyQueryDto } from '../dto/pendency-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class PendenciesService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async findAll(query: PendencyQueryDto): Promise<PaginatedResult<Document>> {
    const {
      page = 1,
      limit = 10,
      employeeId,
      documentTypeId,
      department,
    } = query;

    const qb = this.documentRepository
      .createQueryBuilder('document')
      .where('document.status = :status', { status: DocumentStatus.PENDING })
      .andWhere('document.isActive = true')
      .andWhere('document.deletedAt IS NULL')
      .leftJoinAndSelect('document.employee', 'employee')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .andWhere('employee.deletedAt IS NULL');

    if (employeeId) {
      qb.andWhere('document.employeeId = :employeeId', { employeeId });
    }

    if (documentTypeId) {
      qb.andWhere('document.documentTypeId = :documentTypeId', {
        documentTypeId,
      });
    }

    if (department) {
      qb.andWhere('employee.department = :department', { department });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }
}
