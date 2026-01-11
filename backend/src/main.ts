import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  // Swagger OpenAPI setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Activity 8 API')
    .setDescription('API documentation for Activity 8 backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📘 Swagger docs available at http://localhost:${port}/api`);
}

bootstrap();