import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshDto } from '../dto/refresh.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
  type: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role ?? UserRole.EMPLOYEE,
      employeeId: dto.employeeId ?? null,
      refreshTokenHash: null,
    });
    const saved = await this.userRepo.save(user);

    return this.generateTokenPair(saved);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokenPair(user);
  }

  async refresh(dto: RefreshDto): Promise<TokenPair> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(
        dto.refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-changeme' },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Compare the jti (UUID) instead of the full JWT to avoid bcrypt's 72-byte limit
    const match = await bcrypt.compare(payload.jti, user.refreshTokenHash);
    if (!match) throw new UnauthorizedException('Refresh token reuse detected');

    return this.generateTokenPair(user);
  }

  private async generateTokenPair(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET ?? 'changeme',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti },
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-changeme',
          expiresIn: '7d',
        },
      ),
    ]);

    // Hash the jti (UUID) — bcrypt is safe at 36 chars, avoids the 72-byte limit
    const refreshTokenHash = await bcrypt.hash(jti, 10);
    await this.userRepo.update(user.id, { refreshTokenHash });

    return { accessToken, refreshToken };
  }
}
