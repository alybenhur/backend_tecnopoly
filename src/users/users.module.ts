import { Module }          from '@nestjs/common';
import { MongooseModule }  from '@nestjs/mongoose';
import { UsersService }    from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema }       from '../schemas/user.schema';
import { Grade, GradeSchema }     from '../schemas/grade.schema';
import { Subject, SubjectSchema } from '../schemas/subject.schema';
import { Question, QuestionSchema } from '../schemas/question.schema';

@Module({
  imports: [
    // Grade/Subject/Question se registran para poder limpiar las referencias
    // al borrar un usuario (lo que antes hacían las FK ON DELETE).
    MongooseModule.forFeature([
      { name: User.name,     schema: UserSchema },
      { name: Grade.name,    schema: GradeSchema },
      { name: Subject.name,  schema: SubjectSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [UsersController],
  providers:   [UsersService],
  exports:     [UsersService],
})
export class UsersModule {}
