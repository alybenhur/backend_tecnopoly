import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { SubjectsModule } from '../subjects/subjects.module';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';

@Module({
  imports: [SubjectsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, AssignedProfessorGuard],
})
export class QuestionsModule {}
