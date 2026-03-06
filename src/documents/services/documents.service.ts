import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentQueryDto } from '../dto/document-query.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { StorageService } from '../../storage/storage.service';
import { IUploadedFile } from '../interfaces/uploaded-file.interface';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
  ) {}

  async submit(
    employeeId: string,
    documentTypeId: string,
    file: IUploadedFile,
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

    const newVersion = current.version + 1;
    const storageKey = this.storageService.buildKey(
      employeeId,
      documentTypeId,
      newVersion,
      file.originalname,
    );
    await this.storageService.upload(
      storageKey,
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(Document, { ...current, isActive: false });
      const newDoc = await queryRunner.manager.save(Document, {
        employeeId,
        documentTypeId,
        version: newVersion,
        status: DocumentStatus.SUBMITTED,
        isActive: true,
        fileName: file.originalname,
        storageKey,
        fileSize: file.size ?? file.buffer.length,
        contentType: file.mimetype,
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

  async getDownloadUrl(
    employeeId: string,
    documentTypeId: string,
  ): Promise<string> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, deletedAt: IsNull() },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    const doc = await this.documentRepository.findOne({
      where: {
        employeeId,
        documentTypeId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    if (!doc) {
      throw new NotFoundException(
        'No active document found for this employee and document type',
      );
    }
    if (!doc.storageKey) {
      throw new NotFoundException(
        'No file has been uploaded for this document yet',
      );
    }

    return this.storageService.getSignedDownloadUrl(doc.storageKey);
  }

  async getHistory(
    employeeId: string,
    documentTypeId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<Document>> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, deletedAt: IsNull() },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [history, total] = await this.documentRepository.findAndCount({
      where: { employeeId, documentTypeId },
      order: { version: 'DESC' },
      withDeleted: true,
      skip: (page - 1) * limit,
      take: limit,
    });

    if (!history.length) {
      throw new NotFoundException(
        'No document history found for this employee and document type',
      );
    }

    return {
      data: history,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
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
