import { Module }               from '@nestjs/common';
import { MongooseModule }       from '@nestjs/mongoose';
import { CategoriesService }    from './categories.service';
import { CategoriesController } from './categories.controller';
import { SubjectsModule }       from '../subjects/subjects.module';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Question, QuestionSchema } from '../schemas/question.schema';
import { Subject, SubjectSchema }   from '../schemas/subject.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Subject.name,  schema: SubjectSchema },
    ]),
    SubjectsModule,
  ],
  controllers: [CategoriesController],
  providers:   [CategoriesService, AssignedProfessorGuard],
  exports:     [CategoriesService],
})
export class CategoriesModule {}
