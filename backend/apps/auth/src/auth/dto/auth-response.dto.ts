import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
    @ApiProperty({
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    access_token: string;

    @ApiProperty({
        description: 'User information',
        example: {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe',
        },
    })
    user: {
        id: number;
        email: string;
        name: string;
    };
}
