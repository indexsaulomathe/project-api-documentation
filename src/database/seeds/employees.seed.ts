import { DataSource } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

export const SEED_EMPLOYEES = [
  {
    name: 'João Silva',
    email: 'joao.silva@empresa.com',
    cpf: '52998224725',
    department: 'Engenharia',
    position: 'Desenvolvedor Senior',
  },
  {
    name: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    cpf: '27548438923',
    department: 'Recursos Humanos',
    position: 'Analista de RH',
  },
  {
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@empresa.com',
    cpf: '12345678909',
    department: 'Jurídico',
    position: 'Advogado',
  },
  {
    name: 'Ana Costa',
    email: 'ana.costa@empresa.com',
    cpf: '11144477735',
    department: 'Financeiro',
    position: 'Contadora',
  },
  {
    name: 'Pedro Ferreira',
    email: 'pedro.ferreira@empresa.com',
    cpf: '98765432100',
    department: 'TI',
    position: 'DevOps Engineer',
  },
  {
    name: 'Fernanda Lima',
    email: 'fernanda.lima@empresa.com',
    cpf: '34578916642',
    department: 'Comercial',
    position: 'Executiva de Contas',
  },
];

export async function seedEmployees(
  dataSource: DataSource,
): Promise<Record<string, string>> {
  const repository = dataSource.getRepository(Employee);
  const ids: Record<string, string> = {};

  for (const data of SEED_EMPLOYEES) {
    let employee = await repository.findOne({ where: { cpf: data.cpf } });
    if (!employee) {
      employee = await repository.save(repository.create(data));
      console.log(`  + Employee: ${data.name}`);
    } else {
      console.log(`  ~ Employee (exists): ${data.name}`);
    }
    ids[data.cpf] = employee.id;
  }

  return ids;
}
