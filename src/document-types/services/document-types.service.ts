import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DocumentType } from '../entities/document-type.entity';
import { CreateDocumentTypeDto } from '../dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';
import { DocumentTypeQueryDto } from '../dto/document-type-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly docTypeRepository: Repository<DocumentType>,
  ) {}

  async create(dto: CreateDocumentTypeDto): Promise<DocumentType> {
    const existing = await this.docTypeRepository.findOne({
      where: { name: dto.name, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException('Document type name already in use');
    }

    const docType = this.docTypeRepository.create(dto);
    return this.docTypeRepository.save(docType);
  }

  async findAll(
    query: DocumentTypeQueryDto,
  ): Promise<PaginatedResult<DocumentType>> {
    const { page = 1, limit = 10, name, isRequired } = query;

    const qb = this.docTypeRepository
      .createQueryBuilder('document_type')
      .where('document_type.deletedAt IS NULL');

    if (name) {
      qb.andWhere('LOWER(document_type.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    if (isRequired !== undefined) {
      qb.andWhere('document_type.isRequired = :isRequired', { isRequired });
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

  async findOne(id: string): Promise<DocumentType> {
    const docType = await this.docTypeRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!docType) {
      throw new NotFoundException(`Document type with id ${id} not found`);
    }
    return docType;
  }

  async update(id: string, dto: UpdateDocumentTypeDto): Promise<DocumentType> {
    const docType = await this.findOne(id);

    if (dto.name && dto.name !== docType.name) {
      const existing = await this.docTypeRepository.findOne({
        where: { name: dto.name, deletedAt: IsNull() },
      });
      if (existing) {
        throw new ConflictException(
          'Document type name already in use by another document type',
        );
      }
    }

    return this.docTypeRepository.save({ ...docType, ...dto });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.docTypeRepository.softDelete(id);
    return { message: 'Document type removed successfully' };
  }
}
