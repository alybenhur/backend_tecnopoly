import { Module }       from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService }    from './app.service';

import { AuthModule }      from './auth/auth.module';
import { UsersModule }     from './users/users.module';
import { GradesModule }    from './grades/grades.module';
import { SubjectsModule }  from './subjects/subjects.module';
import { QuestionsModule } from './questions/questions.module';
import { GamesModule }     from './games/games.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('MONGODB_DB', 'tecnopoly'),
        // Los índices se sincronizan solo fuera de producción, igual que
        // hacía `synchronize` con TypeORM.
        autoIndex: config.get<string>('NODE_ENV') !== 'production',
        // Pool reducido: en serverless cada instancia abre su propia conexión.
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      }),
    }),

    AuthModule,
    UsersModule,
    GradesModule,
    SubjectsModule,
    CategoriesModule,
    QuestionsModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers:   [AppService],
})
export class AppModule {}
