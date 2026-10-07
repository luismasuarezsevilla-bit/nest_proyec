import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global: POST /api/v1/reservations
  app.setGlobalPrefix('api/v1');

  // Configuración global de validaciones
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const logger = new Logger('Bootstrap');

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Restaurant Management API')
    .setDescription(
      'API Backend para la gestión de mesas, pedidos y menú del restaurante',
    )
    .setVersion('1.0')
    .addTag('tables')
    .addTag('Reservations', 'Gestión de reservas de mesas')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  logger.log(`API corriendo en: http://localhost:${port}/api/v1`);
  logger.log(`Swagger disponible en: http://localhost:${port}/api/docs`);
}

void bootstrap();