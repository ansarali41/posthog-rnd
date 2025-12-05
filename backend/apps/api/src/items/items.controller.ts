import { Controller, Get, Post, Delete, Body, Query, Param, HttpCode, HttpStatus, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PosthogInterceptor } from '@posthog/posthog';

@ApiTags('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('items')
@ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
})
@ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
})
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) {}

    @Post()
    @UseInterceptors(PosthogInterceptor)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new item',
        description: 'Creates a new item ',
    })
    @ApiBody({
        type: CreateItemDto,
        description: 'Item data to create',
    })
    @ApiResponse({
        status: 201,
        description: 'Item successfully created',
        type: ItemResponseDto,
    })
    async create(@Body() createItemDto: CreateItemDto, @Request() req) {
        const userId = req.user?.id?.toString() || 'anonymous';
        return this.itemsService.create(createItemDto, userId);
    }

    @Get('search')
    @ApiOperation({
        summary: 'Search items',
        description: 'Searches items by name or description.',
    })
    @ApiQuery({
        name: 'q',
        description: 'Search query string',
        required: true,
        example: 'laptop',
    })
    @ApiResponse({
        status: 200,
        description: 'Search results',
        type: [ItemResponseDto],
    })
    async search(@Query('q') query: string, @Request() req) {
        if (!query) {
            return [];
        }

        const userId = req.user?.id?.toString() || 'anonymous';
        return this.itemsService.search(query, userId);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all items',
        description: 'Retrieves all items',
    })
    @ApiResponse({
        status: 200,
        description: 'List of all items',
        type: [ItemResponseDto],
    })
    async findAll(@Request() req) {
        return this.itemsService.findAll();
    }

    @Delete(':id')
    @UseInterceptors(PosthogInterceptor)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete an item',
        description: 'Deletes an item by ID',
    })
    @ApiResponse({
        status: 204,
        description: 'Item successfully deleted',
    })
    @ApiResponse({
        status: 404,
        description: 'Item not found',
    })
    async delete(@Param('id') id: string, @Request() req) {
        const userId = req.user?.id?.toString();
        await this.itemsService.delete(parseInt(id), userId);
    }
}
