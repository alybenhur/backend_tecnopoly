import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { QuestionsService } from '../questions/questions.service';
import { GradesService }    from './grades.service';
import { QuestionLevel }    from '../common/enums/question-level.enum';

// ============================================================
// GradeQuestionsController
//
// Endpoints de preguntas accedidos por jerarquía de grado:
//   GET /api/grades/:gradeId/subjects/:subjectId/questions
//
// Son públicos — no requieren autenticación.
// ============================================================

@ApiTags('grades')
@Controller('grades/:gradeId/subjects/:subjectId/questions')
export class GradeQuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly gradesService:    GradesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar preguntas de una asignatura dentro de un grado',
    description:
      'Devuelve las preguntas de una asignatura verificando que pertenezca al grado indicado. ' +
      'Opcionalmente filtradas por nivel. Acceso público.',
  })
  @ApiParam({ name: 'gradeId',   type: 'string', format: 'uuid', description: 'ID del grado' })
  @ApiParam({ name: 'subjectId', type: 'string', format: 'uuid', description: 'ID de la asignatura' })
  @ApiQuery({ name: 'level', required: false, enum: QuestionLevel, description: 'Filtrar por nivel (basico | medio | avanzado)' })
  @ApiResponse({ status: 200, description: 'Lista de preguntas con sus opciones.' })
  @ApiResponse({ status: 404, description: 'Grado o asignatura no encontrada, o la asignatura no pertenece al grado.' })
  async findQuestionsByGradeAndSubject(
    @Param('gradeId',   ParseUUIDPipe) gradeId:   string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Query('level') level?: QuestionLevel,
  ) {
    // Verificar que la asignatura pertenece al grado
    const subjects = await this.gradesService.findSubjectsByGrade(gradeId);
    const belongs  = subjects.some((s: any) => s.id === subjectId);

    if (!belongs) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException(
        `La asignatura con id "${subjectId}" no pertenece al grado "${gradeId}"`,
      );
    }

    return this.questionsService.findAllBySubject(subjectId, level);
  }
}
