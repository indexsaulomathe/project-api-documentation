import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeDocumentType } from '../../employee-document-types/entities/employee-document-type.entity';
import { Document } from '../../documents/entities/document.entity';

@Entity('document_types')
export class DocumentType extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Index()
  @Column({ default: false })
  isRequired: boolean;

  @OneToMany(() => EmployeeDocumentType, (edt) => edt.documentType)
  employeeDocumentTypes: EmployeeDocumentType[];

  @OneToMany(() => Document, (doc) => doc.documentType)
  documents: Document[];
}
