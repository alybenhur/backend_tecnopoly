import { Module }                   from '@nestjs/common';
import { MongooseModule }           from '@nestjs/mongoose';
import { GradesService }            from './grades.service';
import { GradesController }         from './grades.controller';
import { GradeQuestionsController } from './grade-questions.controller';
import { QuestionsModule }          from '../questions/questions.module';
import { Grade, GradeSchema }       from '../schemas/grade.schema';
import { Subject, SubjectSchema }   from '../schemas/subject.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Grade.name,   schema: GradeSchema },
      { name: Subject.name, schema: SubjectSchema },
    ]),
    QuestionsModule,
  ],
  controllers: [GradesController, GradeQuestionsController],
  providers:   [GradesService],
  exports:     [GradesService],
})
export class GradesModule {}
