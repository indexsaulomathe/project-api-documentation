import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;
}
