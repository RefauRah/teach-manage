import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRepository } from '../repositories/interfaces.js';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/index.js';

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async register(req: RegisterRequest): Promise<AuthResponse> {
    const existing = await this.userRepo.getByEmail(req.email);
    if (existing) {
      throw new Error('email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(req.password, salt);

    const user = await this.userRepo.create({
      name: req.name,
      email: req.email,
      password_hash: passwordHash
    });

    const tokens = this.generateTokens(user.id);

    return {
      token: tokens.token,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };
  }

  async login(req: LoginRequest): Promise<AuthResponse> {
    const user = await this.userRepo.getByEmail(req.email);
    if (!user || !user.password_hash) {
      throw new Error('invalid email or password');
    }

    const isMatch = await bcrypt.compare(req.password, user.password_hash);
    if (!isMatch) {
      throw new Error('invalid email or password');
    }

    const tokens = this.generateTokens(user.id);

    return {
      token: tokens.token,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };
  }

  async refreshToken(tokenStr: string): Promise<{ token: string; refresh_token: string }> {
    try {
      const decoded = jwt.verify(tokenStr, config.jwtRefreshSecret) as { sub: string };
      if (!decoded || !decoded.sub) {
        throw new Error('invalid token subject');
      }

      const user = await this.userRepo.getById(decoded.sub);
      if (!user) {
        throw new Error('user not found');
      }

      const tokens = this.generateTokens(user.id);
      return {
        token: tokens.token,
        refresh_token: tokens.refreshToken
      };
    } catch (err: any) {
      throw new Error('invalid refresh token');
    }
  }

  generateTokens(userId: string): { token: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { sub: userId },
      config.jwtSecret,
      { expiresIn: `${config.jwtAccessExpiryMin}m` }
    );

    const refreshToken = jwt.sign(
      { sub: userId },
      config.jwtRefreshSecret,
      { expiresIn: `${config.jwtRefreshExpiryDays}d` }
    );

    return { token: accessToken, refreshToken };
  }
}
