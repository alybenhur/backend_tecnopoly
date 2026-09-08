import { NestFactory } from '@nestjs/core';
import { AppModule }   from '../app.module';
import { UsersService } from '../users/users.service';
import { Role }        from '../common/enums/role.enum';

/**
 * Crea el usuario administrador inicial.
 *
 * Es la única forma legítima de tener un admin en una base vacía, ya que
 * /api/users exige un token de admin. Ejecutar con:  npm run seed
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const users = app.get(UsersService);

    const email    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@tecnopoly.com';
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name     = process.env.SEED_ADMIN_NAME     ?? 'Administrador';

    if (!password) {
      throw new Error(
        'Falta SEED_ADMIN_PASSWORD en el .env — define una contraseña antes de ejecutar el seed.',
      );
    }

    const existing = await users.findAll(Role.ADMIN);
    if (existing.some(u => u.email === email.toLowerCase())) {
      console.log(`El admin ${email} ya existe, no se crea de nuevo.`);
      return;
    }

    const admin = await users.create({ name, email, password, role: Role.ADMIN });
    console.log(`Admin creado: ${admin.email} (id ${admin.id})`);
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error ejecutando el seed:', err.message);
    process.exit(1);
  });
