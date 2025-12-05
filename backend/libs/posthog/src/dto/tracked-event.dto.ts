import { ApiProperty } from '@nestjs/swagger';

export class TrackedEventDto {
  @ApiProperty({
    description: 'User identifier',
    example: 'user_123',
  })
  distinctId: string;

  @ApiProperty({
    description: 'Name of the tracked event',
    example: 'item_created',
  })
  eventName: string;

  @ApiProperty({
    description: 'Event properties',
    example: { item_id: 1, item_name: 'Sample Item' },
  })
  properties: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when the event was tracked',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: Date;
}

