import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';
import {
  Document,
  DocumentStatus,
} from '../../documents/entities/document.entity';

export interface StatsResult {
  totalEmployees: number;
  totalDocumentTypes: number;
  documents: {
    total: number;
    pending: number;
    submitted: number;
  };
  complianceRate: number;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(DocumentType)
    private readonly docTypeRepository: Repository<DocumentType>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async getStats(): Promise<StatsResult> {
    const [
      totalEmployees,
      totalDocumentTypes,
      pendingDocuments,
      submittedDocuments,
    ] = await Promise.all([
      this.employeeRepository.count({ where: { deletedAt: IsNull() } }),
      this.docTypeRepository.count({ where: { deletedAt: IsNull() } }),
      this.documentRepository.count({
        where: {
          status: DocumentStatus.PENDING,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.documentRepository.count({
        where: {
          status: DocumentStatus.SUBMITTED,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
    ]);

    const total = pendingDocuments + submittedDocuments;
    const complianceRate =
      total > 0
        ? Math.round((submittedDocuments / total) * 100 * 100) / 100
        : 0;

    return {
      totalEmployees,
      totalDocumentTypes,
      documents: {
        total,
        pending: pendingDocuments,
        submitted: submittedDocuments,
      },
      complianceRate,
    };
  }
}
