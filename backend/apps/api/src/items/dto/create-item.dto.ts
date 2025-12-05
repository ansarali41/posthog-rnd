import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
    @ApiProperty({
        description: 'Name of the item',
        example: 'Sample Item',
        minLength: 1,
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Description of the item',
        example: 'This is a sample item description',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Additional metadata for the item',
        example: { category: 'electronics', price: 99.99 },
        required: false,
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
