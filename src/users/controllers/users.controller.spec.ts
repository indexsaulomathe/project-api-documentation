import { UsersController } from './users.controller';
import { User, UserRole } from '../../auth/entities/user.entity';
import { UpdateMeDto } from '../dto/update-me.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UserQueryDto } from '../dto/user-query.dto';

const mockUsersService = () => ({
  getMe: jest.fn(),
  updateMe: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateRole: jest.fn(),
  remove: jest.fn(),
});

const mockUser = (): User =>
  ({
    id: 'uuid-1',
    email: 'user@example.com',
    role: UserRole.EMPLOYEE,
  }) as User;

describe('UsersController', () => {
  let controller: UsersController;
  let service: ReturnType<typeof mockUsersService>;

  beforeEach(() => {
    service = mockUsersService();
    controller = new UsersController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should delegate to usersService.getMe', () => {
      const user = mockUser();
      const expected = { id: user.id, email: user.email, role: user.role };
      service.getMe.mockReturnValue(expected);

      const result = controller.getMe(user);
      expect(service.getMe).toHaveBeenCalledWith(user);
      expect(result).toEqual(expected);
    });
  });

  describe('updateMe', () => {
    it('should delegate to usersService.updateMe', async () => {
      const user = mockUser();
      const dto: UpdateMeDto = { email: 'new@example.com' };
      const expected = { ...user, email: dto.email };
      service.updateMe.mockResolvedValue(expected);

      const result = await controller.updateMe(user, dto);
      expect(service.updateMe).toHaveBeenCalledWith(user, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should delegate to usersService.findAll', async () => {
      const query: UserQueryDto = { page: 1, limit: 10 };
      const expected = {
        data: [],
        meta: { total: 0, page: 1, lastPage: 1, limit: 10 },
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should delegate to usersService.findOne', async () => {
      const expected = { id: 'uuid-1', email: 'user@example.com' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('uuid-1');
      expect(service.findOne).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(expected);
    });
  });

  describe('updateRole', () => {
    it('should delegate to usersService.updateRole', async () => {
      const dto: UpdateUserRoleDto = { role: UserRole.ADMIN };
      const expected = { id: 'uuid-1', role: UserRole.ADMIN };
      service.updateRole.mockResolvedValue(expected);

      const result = await controller.updateRole('uuid-1', dto);
      expect(service.updateRole).toHaveBeenCalledWith('uuid-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should delegate to usersService.remove', async () => {
      const expected = { message: 'User removed successfully' };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove('uuid-1');
      expect(service.remove).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(expected);
    });
  });
});
