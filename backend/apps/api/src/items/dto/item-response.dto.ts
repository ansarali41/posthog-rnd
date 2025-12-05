import { ApiProperty } from '@nestjs/swagger';

export class ItemResponseDto {
    @ApiProperty({
        description: 'Unique identifier of the item',
        example: 1,
    })
    id: number;

    @ApiProperty({
        description: 'Name of the item',
        example: 'Sample Item',
    })
    name: string;

    @ApiProperty({
        description: 'Description of the item',
        example: 'This is a sample item description',
        required: false,
        nullable: true,
    })
    description: string | null;

    @ApiProperty({
        description: 'Additional metadata for the item',
        example: { category: 'electronics', price: 99.99 },
        required: false,
        nullable: true,
    })
    metadata: Record<string, any> | null;

    @ApiProperty({
        description: 'Date when the item was created',
        example: '2024-01-15T10:30:00.000Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Date when the item was last updated',
        example: '2024-01-15T10:30:00.000Z',
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'User who created the item',
        required: false,
        nullable: true,
        example: {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe',
        },
    })
    createdBy?: {
        id: number;
        email: string;
        name: string;
    } | null;

    @ApiProperty({
        description: 'ID of the user who created the item',
        required: false,
        nullable: true,
        example: 1,
    })
    createdById?: number | null;
}
