import { Controller, Get, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PosthogService } from './posthog.service';
import { EventsResponseDto } from './dto/events-response.dto';

@ApiTags('posthog')
@Controller('posthog')
export class PosthogController {
  constructor(private readonly posthogService: PosthogService) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get PostHog integration information',
    description: 'Returns information about PostHog integration and tracked events',
  })
  @ApiResponse({
    status: 200,
    description: 'PostHog integration information',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'active',
        },
        trackedEvents: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            'item_created',
            'item_searched',
            'api_item_create_called',
            'api_item_search_called',
            'api_items_list_called',
          ],
        },
        description: {
          type: 'string',
          example: 'PostHog is integrated to track all API calls and database operations',
        },
      },
    },
  })
  getInfo() {
    const status = this.posthogService.getStatus();
    
    return {
      status: status.configured ? 'active' : 'not_configured',
      configured: status.configured,
      host: status.host,
      eventLogSize: status.eventLogSize,
      trackedEvents: [
        'item_created',
        'item_searched',
        'api_item_create_called',
        'api_item_search_called',
        'api_items_list_called',
      ],
      description: status.configured 
        ? 'PostHog is integrated to track all API calls and database operations. All events are automatically tracked when endpoints are called.'
        : 'PostHog API key is not configured. Set POSTHOG_API_KEY in your .env file. Get your key from https://app.posthog.com/project/settings',
      documentation: 'View events at https://app.posthog.com',
      dashboardUrl: 'https://app.posthog.com',
      note: status.configured 
        ? 'Events are being tracked and sent to PostHog'
        : '⚠️ Configure POSTHOG_API_KEY to start tracking events',
    };
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get recent PostHog events',
    description: 'Returns a log of recently tracked events from this server instance. Useful for debugging and verifying events are being tracked. Events are also sent to PostHog Cloud and can be viewed in the PostHog dashboard.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of events to return (default: 50, max: 100)',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of recent tracked events',
    type: EventsResponseDto,
  })
  getRecentEvents(@Query('limit') limit?: string): EventsResponseDto {
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const events = this.posthogService.getRecentEvents(limitNum);

    return {
      events,
      count: events.length,
      note: 'These are local logs. View all events in PostHog dashboard at https://app.posthog.com',
      dashboardUrl: 'https://app.posthog.com',
    };
  }

  @Delete('events')
  @ApiOperation({
    summary: 'Clear PostHog event log',
    description: 'Clears the local event log. This does not affect events already sent to PostHog Cloud.',
  })
  @ApiResponse({
    status: 200,
    description: 'Event log cleared',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Event log cleared successfully',
        },
        note: {
          type: 'string',
          example: 'This only clears local logs. Events in PostHog Cloud are not affected.',
        },
      },
    },
  })
  clearEvents() {
    this.posthogService.clearEventLog();
    return {
      message: 'Event log cleared successfully',
      note: 'This only clears local logs. Events in PostHog Cloud are not affected.',
    };
  }
}

