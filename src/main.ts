import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── CORS ────────────────────────────────────────────────────────────────
  // CORS_ORIGINS puede ser:
  //   '*'                  → permite cualquier origen (recomendado para WebGL)
  //   'url1,url2,...'      → lista de orígenes específicos
  //   (no definido)        → permite cualquier origen por defecto
  const rawOrigins = process.env.CORS_ORIGINS;

  let corsOrigin: string | string[] | boolean;

  if (!rawOrigins || rawOrigins === '*') {
    corsOrigin = true;             // Refleja el origen de la request (compatible con credentials)
  } else {
    corsOrigin = rawOrigins.split(',').map(o => o.trim());
  }

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  // ─────────────────────────────────────────────────────────────────────────

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // ─── Swagger ────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Tecnopoly API')
    .setDescription(
      'Backend del sistema de preguntas por asignatura. ' +
      'Maneja roles de Admin y Profesor, asignaturas, y banco de preguntas con niveles.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'access-token',
    )
    .addTag('auth', 'Autenticación y sesión')
    .addTag('users', 'Gestión de usuarios (solo Admin)')
    .addTag('subjects', 'Gestión de asignaturas')
    .addTag('questions', 'Banco de preguntas por asignatura')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  // ────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on:  http://localhost:${port}/api`);
  console.log(`Swagger docs available:  http://localhost:${port}/docs`);
}
bootstrap();
