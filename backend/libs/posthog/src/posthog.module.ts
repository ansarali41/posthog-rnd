import { Module, Global } from '@nestjs/common';
import { PosthogService } from './posthog.service';
import { PosthogController } from './posthog.controller';
import { PosthogInterceptor } from './posthog.interceptor';

@Global()
@Module({
  controllers: [PosthogController],
  providers: [PosthogService, PosthogInterceptor],
  exports: [PosthogService, PosthogInterceptor],
})
export class PosthogModule {}

