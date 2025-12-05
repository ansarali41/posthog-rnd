import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Creates a new user account and returns JWT token',
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered',
        type: AuthResponseDto,
    })
    @ApiResponse({
        status: 409,
        description: 'User with this email already exists',
    })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @ApiOperation({
        summary: 'Login user',
        description: 'Authenticates user and returns JWT token',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully logged in',
        type: AuthResponseDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid credentials',
    })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Get current user profile',
        description: 'Returns the authenticated user profile',
    })
    @ApiResponse({
        status: 200,
        description: 'User profile',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number', example: 1 },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                createdAt: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    getProfile(@Request() req) {
        return req.user;
    }
}
