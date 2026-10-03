import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { QuestionsService }  from '../questions/questions.service';
import { GradesService }     from './grades.service';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

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
      'Opcionalmente filtradas por categoría. Acceso público.',
  })
  @ApiParam({ name: 'gradeId',   type: 'string', description: 'ObjectId del grado' })
  @ApiParam({ name: 'subjectId', type: 'string', description: 'ObjectId de la asignatura' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoría (ObjectId)' })
  @ApiResponse({ status: 200, description: 'Lista de preguntas con sus opciones.' })
  @ApiResponse({ status: 404, description: 'Grado o asignatura no encontrada, o la asignatura no pertenece al grado.' })
  async findQuestionsByGradeAndSubject(
    @Param('gradeId',   ParseObjectIdPipe) gradeId:   string,
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Query('category') category?: string,
  ) {
    if (category && !Types.ObjectId.isValid(category))
      throw new BadRequestException('category debe ser un ObjectId válido');
    await this.gradesService.assertSubjectBelongs(gradeId, subjectId);
    return this.questionsService.findAllBySubject(subjectId, category || undefined);
  }
}
