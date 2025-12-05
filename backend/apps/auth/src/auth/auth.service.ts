import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@common/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private jwtService: JwtService,
    ) {}

    async register(registerDto: RegisterDto) {
        // Check if user already exists
        const existingUser = await this.usersRepository.findOne({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        // Create user
        const user = this.usersRepository.create({
            email: registerDto.email,
            password: hashedPassword,
            name: registerDto.name || registerDto.email.split('@')[0],
        });

        const savedUser = await this.usersRepository.save(user);

        // Generate JWT token
        const payload = { sub: savedUser.id, email: savedUser.email };
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: savedUser.id,
                email: savedUser.email,
                name: savedUser.name,
            },
        };
    }

    async login(loginDto: LoginDto) {
        // Find user
        const user = await this.usersRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('User account is inactive');
        }

        // Generate JWT token
        const payload = { sub: user.id, email: user.email };
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }

    async validateUser(userId: number): Promise<User | null> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
        });

        if (!user || !user.isActive) {
            return null;
        }

        return user;
    }
}
