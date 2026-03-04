import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { SubmitDocumentDto } from '../dto/submit-document.dto';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    employeeId: string,
    documentTypeId: string,
    dto: SubmitDocumentDto,
  ): Promise<Document> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, deletedAt: IsNull() },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    const current = await this.documentRepository.findOne({
      where: {
        employeeId,
        documentTypeId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    if (!current) {
      throw new NotFoundException(
        'No active document found for this employee and document type',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(Document, { ...current, isActive: false });
      const newDoc = await queryRunner.manager.save(Document, {
        employeeId,
        documentTypeId,
        version: current.version + 1,
        status: DocumentStatus.SUBMITTED,
        isActive: true,
        fileName: dto.fileName,
        submittedAt: new Date(),
      });
      await queryRunner.commitTransaction();
      return newDoc;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getHistory(
    employeeId: string,
    documentTypeId: string,
  ): Promise<Document[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, deletedAt: IsNull() },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    const history = await this.documentRepository.find({
      where: { employeeId, documentTypeId },
      order: { version: 'DESC' },
      withDeleted: true,
    });

    if (!history.length) {
      throw new NotFoundException(
        'No document history found for this employee and document type',
      );
    }

    return history;
  }

  async findByEmployee(
    employeeId: string,
    query: DocumentQueryDto,
  ): Promise<PaginatedResult<Document>> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, deletedAt: IsNull() },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    const { page = 1, limit = 10, status, documentTypeId } = query;

    const qb = this.documentRepository
      .createQueryBuilder('document')
      .where('document.employeeId = :employeeId', { employeeId })
      .andWhere('document.isActive = true')
      .andWhere('document.deletedAt IS NULL')
      .leftJoinAndSelect('document.documentType', 'documentType');

    if (status) {
      qb.andWhere('document.status = :status', { status });
    }

    if (documentTypeId) {
      qb.andWhere('document.documentTypeId = :documentTypeId', {
        documentTypeId,
      });
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
