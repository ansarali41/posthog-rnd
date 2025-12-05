import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PosthogModule } from '@posthog/posthog';
import { ItemsModule } from './items/items.module';
import { Item } from './items/entities/item.entity';
import { User } from '@common/common';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'posthog_demo',
            entities: [Item, User],
            synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev
        }),
        TypeOrmModule.forFeature([User]),
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            signOptions: { expiresIn: '7d' },
        }),
        PosthogModule,
        ItemsModule,
    ],
    providers: [JwtStrategy],
})
export class AppModule {}
