import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from '../../auth/entities/user.entity';
import { UpdateMeDto } from '../dto/update-me.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UserQueryDto } from '../dto/user-query.dto';

const mockUser = (): User =>
  ({
    id: 'uuid-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    role: UserRole.EMPLOYEE,
    refreshTokenHash: null,
    employeeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }) as User;

const mockRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('getMe', () => {
    it('should return the current user without sensitive fields', () => {
      const user = mockUser();
      const result = service.getMe(user);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokenHash');
      expect(result.id).toBe(user.id);
    });
  });

  describe('updateMe', () => {
    it('should update email when new email is not taken', async () => {
      const user = mockUser();
      const dto: UpdateMeDto = { email: 'new@example.com' };
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({ ...user, email: dto.email! });

      const result = await service.updateMe(user, dto);
      expect(result.email).toBe(dto.email);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when email is taken', async () => {
      const user = mockUser();
      const dto: UpdateMeDto = { email: 'taken@example.com' };
      repo.findOne.mockResolvedValue({ ...mockUser(), id: 'uuid-other' });

      await expect(service.updateMe(user, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash new password when provided', async () => {
      const user = mockUser();
      const dto: UpdateMeDto = { password: 'NewPass@123' };
      repo.save.mockResolvedValue(user);

      await service.updateMe(user, dto);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users without sensitive fields', async () => {
      const user = mockUser();
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[user], 1]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const query: UserQueryDto = { page: 1, limit: 10 };
      const result = await service.findAll(query);

      expect(result.meta.total).toBe(1);
      expect(result.data[0]).not.toHaveProperty('passwordHash');
    });

    it('should filter by email when provided', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 10, email: 'test@example.com' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('email'),
        expect.any(Object),
      );
    });

    it('should filter by role when provided', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 10, role: UserRole.ADMIN });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('role'),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return user without sensitive fields', async () => {
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);

      const result = await service.findOne('uuid-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when user not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    it('should update role and return user without sensitive fields', async () => {
      const user = mockUser();
      const dto: UpdateUserRoleDto = { role: UserRole.ADMIN };
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      const result = await service.updateRole('uuid-1', dto);
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when user not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRole('uuid-1', { role: UserRole.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete user and return message', async () => {
      repo.findOne.mockResolvedValue(mockUser());
      repo.softDelete.mockResolvedValue(undefined as any);

      const result = await service.remove('uuid-1');
      expect(result).toEqual({ message: 'User removed successfully' });
      expect(repo.softDelete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException when user not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sanitize (private via public methods)', () => {
    it('should strip passwordHash and refreshTokenHash from output', async () => {
      const user = mockUser();
      repo.findOne.mockResolvedValue(user);
      const result = await service.findOne('uuid-1');
      expect(Object.keys(result)).not.toContain('passwordHash');
      expect(Object.keys(result)).not.toContain('refreshTokenHash');
    });
  });
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
  compare: jest.fn(),
}));
