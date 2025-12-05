import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable CORS for frontend
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });

    // Enable validation
    app.useGlobalPipes(new ValidationPipe());

    // PostHog interceptor is applied selectively to specific controllers/methods
    // See items.controller.ts for usage

    // Swagger/OpenAPI Documentation
    const config = new DocumentBuilder()
        .setTitle('PostHog Demo API')
        .setDescription('API documentation for PostHog Demo application with event tracking')
        .setVersion('1.0')
        .addTag('items', 'Item management endpoints (requires authentication)')
        .addTag('posthog', 'PostHog event tracking information')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
        customSiteTitle: 'PostHog Demo API Docs',
        customfavIcon: 'https://posthog.com/favicon.ico',
        customCss: '.swagger-ui .topbar { display: none }',
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`Backend server running on http://localhost:${port}`);
    console.log(`Swagger documentation available at http://localhost:${port}/api`);
    console.log(`API endpoints available at http://localhost:${port}/api/items`);
}
bootstrap();
