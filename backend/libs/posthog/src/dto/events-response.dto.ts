import { ApiProperty } from '@nestjs/swagger';
import { TrackedEventDto } from './tracked-event.dto';

export class EventsResponseDto {
  @ApiProperty({
    description: 'List of recent tracked events',
    type: [TrackedEventDto],
  })
  events: TrackedEventDto[];

  @ApiProperty({
    description: 'Number of events returned',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Information note',
    example: 'These are local logs. View all events in PostHog dashboard at https://app.posthog.com',
  })
  note: string;

  @ApiProperty({
    description: 'PostHog dashboard URL',
    example: 'https://app.posthog.com',
  })
  dashboardUrl: string;
}

