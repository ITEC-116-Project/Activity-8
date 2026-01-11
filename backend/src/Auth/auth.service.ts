import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User as UserEntity } from '../typeorm/entities/users';

interface PublicUser {
  id: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async signup(username: string, password: string) {
    // Validate username
    if (!username || username.trim().length < 3) {
      throw new ConflictException('Username must be at least 3 characters');
    }

    // Check if username already exists (using email column as username)
    const existing = await this.userRepo.findOne({ where: { email: username } });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new ConflictException('Password must be at least 6 characters');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user entity
    const userEntity = this.userRepo.create({
      user_id: Date.now(),
      name: username,
      email: username,
      password: hashedPassword,
    } as any);

    const saved = await this.userRepo.save(userEntity);
    const savedUser = (saved as unknown) as UserEntity;

    return {
      success: true,
      user: {
        id: savedUser.id.toString(),
        username: savedUser.name,
      }
    };
  }

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email: username } });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

  const isPasswordValid = await bcrypt.compare(password, (user as any).password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      success: true,
      user: {
        id: (user as any).id.toString(),
        username: (user as any).name,
      }
    };
  }

  // Keep the old simple login for backward compatibility (optional)
  async simpleLogin(loginDto: LoginDto) {
    const { username } = loginDto;

    if (!username || username.trim() === '') {
      return {
        success: false,
        error: 'Username is required',
      };
    }

    // create user without password if not exists
    let user = await this.userRepo.findOne({ where: { email: username } });
    if (!user) {
      const userEntity = this.userRepo.create({ user_id: Date.now(), name: username, email: username, password: '' } as any);
      const saved2 = await this.userRepo.save(userEntity);
      user = (saved2 as unknown) as UserEntity;
    }

    return {
      success: true,
      user: {
        id: (user as any).id.toString(),
        username: (user as any).name,
      }
    };
  }

  async logout(userId: string) {
    // For DB-based users we don't delete on logout. Keep API for compatibility.
    const user = await this.userRepo.findOne({ where: { id: Number(userId) } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async getUser(userId: string): Promise<PublicUser | undefined> {
    const user = await this.userRepo.findOne({ where: { id: Number(userId) } });
    if (!user) return undefined;

    return { id: user.id.toString(), username: user.name };
  }

  async getAllUsers(): Promise<PublicUser[]> {
    const users = await this.userRepo.find();
    return users.map(u => ({ id: u.id.toString(), username: u.name }));
  }
}