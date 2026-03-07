import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const existingEmail = await this.employeeRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingCpf = await this.employeeRepository.findOne({
      where: { cpf: dto.cpf, deletedAt: IsNull() },
    });
    if (existingCpf) {
      throw new ConflictException('CPF already in use');
    }

    const employee = this.employeeRepository.create(dto);
    return this.employeeRepository.save(employee);
  }

  async findAll(query: EmployeeQueryDto): Promise<PaginatedResult<Employee>> {
    const { page = 1, limit = 10, department, name } = query;

    const qb = this.employeeRepository
      .createQueryBuilder('employee')
      .where('employee.deletedAt IS NULL');

    if (department) {
      qb.andWhere('employee.department = :department', { department });
    }

    if (name) {
      qb.andWhere('LOWER(employee.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
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

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id ${id} not found`);
    }
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (dto.email && dto.email !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: dto.email, deletedAt: IsNull() },
      });
      if (existing) {
        throw new ConflictException('Email already in use by another employee');
      }
    }

    if (dto.cpf && dto.cpf !== employee.cpf) {
      const existing = await this.employeeRepository.findOne({
        where: { cpf: dto.cpf, deletedAt: IsNull() },
      });
      if (existing) {
        throw new ConflictException('CPF already in use by another employee');
      }
    }

    return this.employeeRepository.save({ ...employee, ...dto });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.employeeRepository.softDelete(id);
    return { message: 'Employee removed successfully' };
  }
}
