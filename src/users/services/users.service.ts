import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../auth/entities/user.entity';
import { UpdateMeDto } from '../dto/update-me.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  getMe(user: User): SafeUser {
    return this.sanitize(user);
  }

  async updateMe(user: User, dto: UpdateMeDto): Promise<SafeUser> {
    if (dto.email && dto.email !== user.email) {
      const taken = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (taken) throw new ConflictException('Email already in use');
      user.email = dto.email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  async findAll(query: UserQueryDto): Promise<PaginatedResult<SafeUser>> {
    const { page = 1, limit = 10, email, role } = query;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (email) {
      qb.andWhere('LOWER(user.email) LIKE LOWER(:email)', {
        email: `%${email}%`,
      });
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((u) => this.sanitize(u)),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return this.sanitize(user);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<SafeUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    user.role = dto.role;
    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    await this.userRepo.softDelete(id);
    return { message: 'User removed successfully' };
  }

  private sanitize(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshTokenHash, ...safe } = user;
    return safe;
  }
}
