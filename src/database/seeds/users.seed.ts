import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../auth/entities/user.entity';

const SALT_ROUNDS = 10;

interface UserSeed {
  email: string;
  password: string;
  role: UserRole;
  cpfKey?: string; // cpf of the related employee (resolved after employees seed)
}

export const SEED_USERS: UserSeed[] = [
  {
    email: 'admin@empresa.com',
    password: 'Admin@1234',
    role: UserRole.ADMIN,
  },
  {
    email: 'joao.silva@empresa.com',
    password: 'Employee@1234',
    role: UserRole.EMPLOYEE,
    cpfKey: '52998224725',
  },
  {
    email: 'maria.santos@empresa.com',
    password: 'Employee@1234',
    role: UserRole.EMPLOYEE,
    cpfKey: '27548438923',
  },
  {
    email: 'carlos.oliveira@empresa.com',
    password: 'Employee@1234',
    role: UserRole.EMPLOYEE,
    cpfKey: '12345678909',
  },
  {
    email: 'ana.costa@empresa.com',
    password: 'Employee@1234',
    role: UserRole.EMPLOYEE,
    cpfKey: '11144477735',
  },
  {
    email: 'pedro.ferreira@empresa.com',
    password: 'Employee@1234',
    role: UserRole.EMPLOYEE,
    cpfKey: '98765432100',
  },
  {
    email: 'fernanda.lima@empresa.com',
    password: 'Employee@1234',
    role: UserRole.EMPLOYEE,
    cpfKey: '34578916642',
  },
];

export async function seedUsers(
  dataSource: DataSource,
  employeeIdsByCpf: Record<string, string> = {},
): Promise<void> {
  const repository = dataSource.getRepository(User);

  for (const data of SEED_USERS) {
    const existing = await repository.findOne({ where: { email: data.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
      const employeeId = data.cpfKey
        ? (employeeIdsByCpf[data.cpfKey] ?? null)
        : null;

      await repository.save(
        repository.create({
          email: data.email,
          passwordHash,
          role: data.role,
          refreshTokenHash: null,
          employeeId,
        }),
      );
      console.log(`  + User: ${data.email} (${data.role})`);
    } else {
      console.log(`  ~ User (exists): ${data.email}`);
    }
  }
}
