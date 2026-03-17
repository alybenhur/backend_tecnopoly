import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { QuestionLevel } from '../common/enums/question-level.enum';

@ApiTags('questions')
@Controller('subjects/:subjectId/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // =========================================================================
  // Rutas PÚBLICAS
  // =========================================================================

  @Get()
  @ApiOperation({
    summary: 'Listar preguntas de una asignatura',
    description: 'Devuelve todas las preguntas con sus opciones. Se puede filtrar por nivel de dificultad. Acceso público.',
  })
  @ApiParam({ name: 'subjectId', description: 'UUID de la asignatura' })
  @ApiQuery({ name: 'level', required: false, enum: QuestionLevel, description: 'Filtrar por nivel de dificultad' })
  @ApiResponse({ status: 200, description: 'Lista de preguntas con sus opciones.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  findAll(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Query('level') level?: QuestionLevel,
  ) {
    return this.questionsService.findAllBySubject(subjectId, level);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pregunta por ID', description: 'Devuelve el detalle completo de una pregunta con sus opciones. Acceso público.' })
  @ApiParam({ name: 'subjectId', description: 'UUID de la asignatura' })
  @ApiParam({ name: 'id', description: 'UUID de la pregunta' })
  @ApiResponse({ status: 200, description: 'Detalle de la pregunta.' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.findOne(id);
  }

  // =========================================================================
  // Rutas PROTEGIDAS
  // =========================================================================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AssignedProfessorGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Crear pregunta',
    description: 'El profesor (asignado a la materia) o admin crea una pregunta con sus opciones de respuesta. Guards: JWT → Roles → AsignaciónProfesor.',
  })
  @ApiParam({ name: 'subjectId', description: 'UUID de la asignatura' })
  @ApiResponse({ status: 201, description: 'Pregunta creada con sus opciones.' })
  @ApiResponse({ status: 400, description: 'correct_answer_index fuera de rango.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Profesor no asignado a esta asignatura.' })
  create(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.questionsService.create(subjectId, createQuestionDto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar pregunta',
    description: 'Solo el profesor que creó la pregunta o un admin puede editarla. Si se envían answer_options, reemplaza todas las opciones anteriores.',
  })
  @ApiParam({ name: 'subjectId', description: 'UUID de la asignatura' })
  @ApiParam({ name: 'id', description: 'UUID de la pregunta' })
  @ApiResponse({ status: 200, description: 'Pregunta actualizada.' })
  @ApiResponse({ status: 403, description: 'Solo el creador o admin puede editar.' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.questionsService.update(id, updateQuestionDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Eliminar pregunta',
    description: 'Solo el profesor que creó la pregunta o un admin puede eliminarla. Las opciones se eliminan en cascada.',
  })
  @ApiParam({ name: 'subjectId', description: 'UUID de la asignatura' })
  @ApiParam({ name: 'id', description: 'UUID de la pregunta' })
  @ApiResponse({ status: 200, description: 'Pregunta eliminada.' })
  @ApiResponse({ status: 403, description: 'Solo el creador o admin puede eliminar.' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.questionsService.remove(id, user);
  }
}
