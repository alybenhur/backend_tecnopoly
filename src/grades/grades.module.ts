import { Module }                    from '@nestjs/common';
import { GradesService }             from './grades.service';
import { GradesController }          from './grades.controller';
import { GradeQuestionsController }  from './grade-questions.controller';
import { QuestionsModule }           from '../questions/questions.module';

@Module({
  imports:     [QuestionsModule],
  controllers: [GradesController, GradeQuestionsController],
  providers:   [GradesService],
  exports:     [GradesService],
})
export class GradesModule {}
