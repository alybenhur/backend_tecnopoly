import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const expressApp = require('express')();

async function createNestServer(expressInstance: unknown) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    { logger: ['error', 'warn'] },
  );

  // ─── CORS ───────────────────────────────────────────────────────────────
  // IMPORTANTE: 'credentials: true' es incompatible con origin: '*'.
  // Se usa 'origin: true' para reflejar el origen de la request,
  // lo que equivale a permitir cualquier origen pero de forma válida.
  const rawOrigins = process.env.CORS_ORIGINS;
  const corsOrigin: string | string[] | boolean =
    !rawOrigins || rawOrigins === '*'
      ? true
      : rawOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ─── Validación global ──────────────────────────────────────────────────
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
    swaggerOptions: { persistAuthorization: true },
  });
  // ────────────────────────────────────────────────────────────────────────

  await app.init();
}

// Caché para reutilizar entre invocaciones serverless
let isInitialized = false;

export default async (req: Request, res: Response) => {
  if (!isInitialized) {
    await createNestServer(expressApp);
    isInitialized = true;
  }
  expressApp(req, res);
};
