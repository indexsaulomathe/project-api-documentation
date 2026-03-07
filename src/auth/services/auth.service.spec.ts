import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';

const mockUserRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockJwtService = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: JwtService, useFactory: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should throw ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'uuid', email: 'a@a.com' });

      await expect(
        service.register({ email: 'a@a.com', password: 'Admin@123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and save user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const savedUser = {
        id: 'user-id',
        email: 'new@test.com',
        role: UserRole.EMPLOYEE,
      };
      userRepo.create.mockReturnValue(savedUser);
      userRepo.save.mockResolvedValue(savedUser);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.register({
        email: 'new@test.com',
        password: 'Admin@123',
      });

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          passwordHash: expect.any(String),
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'uid',
        email: 'x@x.com',
        passwordHash: hash,
        role: UserRole.ADMIN,
      });

      await expect(
        service.login({ email: 'x@x.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens when credentials are valid', async () => {
      const hash = await bcrypt.hash('Admin@123', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'uid',
        email: 'x@x.com',
        passwordHash: hash,
        role: UserRole.ADMIN,
      });
      jwtService.signAsync.mockResolvedValue('signed-token');
      userRepo.update.mockResolvedValue({});

      const result = await service.login({
        email: 'x@x.com',
        password: 'Admin@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException on invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(
        service.refresh({ refreshToken: 'bad.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'uid',
        type: 'refresh',
        jti: 'some-jti-uuid',
      });
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'valid.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token hash does not match', async () => {
      const jti = 'correct-jti-uuid';
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'uid',
        type: 'refresh',
        jti,
      });
      userRepo.findOne.mockResolvedValue({
        id: 'uid',
        refreshTokenHash: await bcrypt.hash('other-jti-uuid', 10),
        role: UserRole.ADMIN,
        email: 'a@a.com',
      });

      await expect(
        service.refresh({ refreshToken: 'different.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens and rotate refresh token', async () => {
      const jti = 'valid-jti-uuid';
      const jtiHash = await bcrypt.hash(jti, 10);
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'uid',
        type: 'refresh',
        jti,
      });
      userRepo.findOne.mockResolvedValue({
        id: 'uid',
        email: 'a@a.com',
        role: UserRole.ADMIN,
        refreshTokenHash: jtiHash,
      });
      jwtService.signAsync.mockResolvedValue('new-token');
      userRepo.update.mockResolvedValue({});

      const result = await service.refresh({
        refreshToken: 'old.refresh.token',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userRepo.update).toHaveBeenCalledWith(
        'uid',
        expect.objectContaining({ refreshTokenHash: expect.any(String) }),
      );
    });
  });
});
