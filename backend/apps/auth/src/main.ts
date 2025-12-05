import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });

    // Enable validation
    app.useGlobalPipes(new ValidationPipe());

    // Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('Auth API')
        .setDescription('Authentication API with JWT')
        .setVersion('1.0')
        .addTag('auth', 'Authentication endpoints')
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
    SwaggerModule.setup('api', app, document);

    const port = process.env.AUTH_PORT || 3002;
    await app.listen(port);
    console.log(`Auth server running on http://localhost:${port}`);
    console.log(`Swagger documentation available at http://localhost:${port}/api`);
}
bootstrap();
