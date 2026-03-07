import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { DocumentType } from '../../document-types/entities/document-type.entity';

@Entity('employee_document_types')
@Index(['employeeId', 'documentTypeId'])
export class EmployeeDocumentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  documentTypeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @ManyToOne(() => Employee, (employee) => employee.employeeDocumentTypes)
  employee: Employee;

  @ManyToOne(() => DocumentType, (dt) => dt.employeeDocumentTypes)
  documentType: DocumentType;
}
