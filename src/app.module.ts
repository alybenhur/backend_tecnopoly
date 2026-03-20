import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule }   from './supabase/supabase.module';
import { AuthModule }       from './auth/auth.module';
import { UsersModule }      from './users/users.module';
import { SubjectsModule }   from './subjects/subjects.module';
import { QuestionsModule }  from './questions/questions.module';
import { GradesModule }     from './grades/grades.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    GradesModule,
    SubjectsModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
