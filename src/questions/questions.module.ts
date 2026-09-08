import { Module }               from '@nestjs/common';
import { MongooseModule }       from '@nestjs/mongoose';
import { QuestionsService }     from './questions.service';
import { QuestionsController }  from './questions.controller';
import { SubjectsModule }       from '../subjects/subjects.module';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';
import { Question, QuestionSchema } from '../schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }]),
    SubjectsModule,
  ],
  controllers: [QuestionsController],
  providers:   [QuestionsService, AssignedProfessorGuard],
  exports:     [QuestionsService],
})
export class QuestionsModule {}
