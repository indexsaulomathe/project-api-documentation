import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmployeeDocumentType } from '../entities/employee-document-type.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';
import {
  Document,
  DocumentStatus,
} from '../../documents/entities/document.entity';

@Injectable()
export class EmployeeDocumentTypesService {
  constructor(
    @InjectRepository(EmployeeDocumentType)
    private readonly edtRepository: Repository<EmployeeDocumentType>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(DocumentType)
    private readonly docTypeRepository: Repository<DocumentType>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async link(
    employeeId: string,
    documentTypeId: string,
  ): Promise<EmployeeDocumentType> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    const docType = await this.docTypeRepository.findOne({
      where: { id: documentTypeId },
    });
    if (!docType) {
      throw new NotFoundException(
        `Document type with id ${documentTypeId} not found`,
      );
    }

    const existing = await this.edtRepository.findOne({
      where: { employeeId, documentTypeId },
    });
    if (existing) {
      throw new ConflictException(
        'Document type already linked to this employee',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const link = await queryRunner.manager.save(EmployeeDocumentType, {
        employeeId,
        documentTypeId,
      });
      await queryRunner.manager.save(Document, {
        employeeId,
        documentTypeId,
        status: DocumentStatus.PENDING,
        version: 1,
        isActive: true,
      });
      await queryRunner.commitTransaction();
      return link;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async unlink(
    employeeId: string,
    documentTypeId: string,
  ): Promise<{ message: string }> {
    const link = await this.edtRepository.findOne({
      where: { employeeId, documentTypeId },
    });
    if (!link) {
      throw new NotFoundException(
        'Link between employee and document type not found',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.softDelete(EmployeeDocumentType, link.id);
      // Gap #2: soft-delete pending documents alongside the link
      await queryRunner.manager.softDelete(Document, {
        employeeId,
        documentTypeId,
        status: DocumentStatus.PENDING,
      });
      await queryRunner.commitTransaction();
      return { message: 'Link removed successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByEmployee(employeeId: string): Promise<EmployeeDocumentType[]> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${employeeId} not found`);
    }

    return this.edtRepository.find({
      where: { employeeId },
      relations: ['documentType'],
    });
  }
}
