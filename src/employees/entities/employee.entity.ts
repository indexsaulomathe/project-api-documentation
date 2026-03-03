import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeDocumentType } from '../../employee-document-types/entities/employee-document-type.entity';
import { Document } from '../../documents/entities/document.entity';

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Index()
  @Column({ unique: true, length: 11 })
  cpf: string;

  @Column()
  department: string;

  @Column({ type: 'varchar', nullable: true })
  position: string | null;

  @OneToMany(() => EmployeeDocumentType, (edt) => edt.employee)
  employeeDocumentTypes: EmployeeDocumentType[];

  @OneToMany(() => Document, (doc) => doc.employee)
  documents: Document[];
}
