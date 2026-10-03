import { Module }             from '@nestjs/common';
import { MongooseModule }     from '@nestjs/mongoose';
import { SubjectsService }    from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { Subject, SubjectSchema }   from '../schemas/subject.schema';
import { User, UserSchema }         from '../schemas/user.schema';
import { Question, QuestionSchema } from '../schemas/question.schema';
import { Category, CategorySchema } from '../schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subject.name,  schema: SubjectSchema },
      { name: User.name,     schema: UserSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [SubjectsController],
  providers:   [SubjectsService],
  exports:     [SubjectsService],
})
export class SubjectsModule {}
