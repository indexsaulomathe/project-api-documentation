import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';
import {
  Document,
  DocumentStatus,
} from '../../documents/entities/document.entity';

export interface MostPendingDocumentType {
  name: string;
  pendingCount: number;
}

export interface LatestSubmission {
  employeeName: string;
  department: string;
  documentTypeName: string;
  submittedAt: Date;
}

export interface StatsResult {
  totalEmployees: number;
  totalDocumentTypes: number;
  documents: {
    total: number;
    pending: number;
    submitted: number;
  };
  complianceRate: number;
  mostPendingDocumentTypes: MostPendingDocumentType[];
  latestSubmissions: LatestSubmission[];
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
      mostPendingDocumentTypes,
      latestSubmissions,
    ] = await Promise.all([
      this.employeeRepository.count(),
      this.docTypeRepository.count(),
      this.documentRepository.count({
        where: {
          status: DocumentStatus.PENDING,
          isActive: true,
        },
      }),
      this.documentRepository.count({
        where: {
          status: DocumentStatus.SUBMITTED,
          isActive: true,
        },
      }),
      this.getMostPendingDocumentTypes(),
      this.getLatestSubmissions(),
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
      mostPendingDocumentTypes,
      latestSubmissions,
    };
  }

  private async getMostPendingDocumentTypes(): Promise<
    MostPendingDocumentType[]
  > {
    const raw = await this.documentRepository
      .createQueryBuilder('document')
      .select('documentType.name', 'name')
      .addSelect('COUNT(document.id)', 'pendingCount')
      .innerJoin('document.documentType', 'documentType')
      .where('document.status = :status', { status: DocumentStatus.PENDING })
      .andWhere('document.isActive = true')
      .andWhere('document.deletedAt IS NULL')
      .groupBy('documentType.id')
      .addGroupBy('documentType.name')
      .orderBy('COUNT(document.id)', 'DESC')
      .limit(5)
      .getRawMany<{ name: string; pendingCount: string }>();

    return raw.map((r) => ({
      name: r.name,
      pendingCount: Number(r.pendingCount),
    }));
  }

  private async getLatestSubmissions(): Promise<LatestSubmission[]> {
    return this.documentRepository
      .createQueryBuilder('document')
      .select('employee.name', 'employeeName')
      .addSelect('employee.department', 'department')
      .addSelect('documentType.name', 'documentTypeName')
      .addSelect('document.submittedAt', 'submittedAt')
      .innerJoin('document.employee', 'employee')
      .innerJoin('document.documentType', 'documentType')
      .where('document.status = :status', { status: DocumentStatus.SUBMITTED })
      .andWhere('document.isActive = true')
      .andWhere('document.deletedAt IS NULL')
      .andWhere('employee.deletedAt IS NULL')
      .orderBy('document.submittedAt', 'DESC')
      .limit(10)
      .getRawMany<LatestSubmission>();
  }
}
