import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';

export enum DocumentStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
}

@Entity('documents')
@Index(['employeeId', 'documentTypeId', 'isActive'])
@Index(['employeeId', 'status'])
export class Document extends BaseEntity {
  @Column()
  employeeId: string;

  @Column()
  documentTypeId: string;

  @Column({ default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'varchar', nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', nullable: true })
  storageKey: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ type: 'varchar', nullable: true })
  contentType: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  submittedAt: Date | null;

  @ManyToOne(() => Employee, (employee) => employee.documents)
  employee: Employee;

  @ManyToOne(() => DocumentType, (dt) => dt.documents)
  documentType: DocumentType;
}
