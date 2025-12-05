import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Item } from './entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { PosthogService } from '@posthog/posthog';

@Injectable()
export class ItemsService {
    constructor(
        @InjectRepository(Item)
        private itemsRepository: Repository<Item>,
        private posthogService: PosthogService,
    ) {}

    async create(createItemDto: CreateItemDto, userId?: string) {
        //throw an error if the item already exists
        const existingItem = await this.itemsRepository.findOne({
            where: { name: createItemDto.name },
        });

        if (existingItem) {
            throw new BadRequestException('Item already exists');
        }

        const item = this.itemsRepository.create({
            ...createItemDto,
            createdById: userId ? parseInt(userId) : null,
        });
        const savedItem = await this.itemsRepository.save(item);

        // Note: API tracking is handled by PosthogInterceptor
        // The api_request event includes all request/response details including the created item

        return savedItem;
    }

    async search(query: string, userId?: string) {
        const items = await this.itemsRepository.find({
            where: [{ name: Like(`%${query}%`) }, { description: Like(`%${query}%`) }],
            relations: ['createdBy'],
        });

        // Note: We do NOT track search events - only errors are tracked
        return items;
    }

    async delete(id: number, userId?: string): Promise<void> {
        const item = await this.itemsRepository.findOne({
            where: { id },
        });

        if (!item) {
            throw new BadRequestException('Item not found');
        }

        // Optional: Check if user owns the item
        if (userId && item.createdById !== parseInt(userId)) {
            throw new BadRequestException('You can only delete your own items');
        }

        await this.itemsRepository.remove(item);
    }

    async findAll() {
        return this.itemsRepository.find({
            relations: ['createdBy'],
        });
    }

    async findOne(id: number) {
        return this.itemsRepository.findOne({
            where: { id },
            relations: ['createdBy'],
        });
    }
}
