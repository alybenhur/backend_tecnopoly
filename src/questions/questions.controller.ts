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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto, DiscardImageDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

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
    description: 'Devuelve todas las preguntas con sus opciones. Se puede filtrar por categoría. Acceso público.',
  })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoría (ObjectId); sin él, todas las categorías' })
  @ApiResponse({ status: 200, description: 'Lista de preguntas con sus opciones.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  findAll(
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Query('category') category?: string,
  ) {
    // Las preguntas ya no tienen nivel: si un cliente antiguo envía ?level= se ignora
    if (category && !Types.ObjectId.isValid(category))
      throw new BadRequestException('category debe ser un ObjectId válido');
    return this.questionsService.findAllBySubject(subjectId, category || undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pregunta por ID', description: 'Devuelve el detalle completo de una pregunta con sus opciones. Acceso público.' })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiParam({ name: 'id', description: 'ObjectId de la pregunta' })
  @ApiResponse({ status: 200, description: 'Detalle de la pregunta.' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada.' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
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
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiResponse({ status: 201, description: 'Pregunta creada con sus opciones.' })
  @ApiResponse({ status: 400, description: 'correct_answer_index fuera de rango.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Profesor no asignado a esta asignatura.' })
  create(
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.questionsService.create(subjectId, createQuestionDto, user.id);
  }

  @Post('image-signature')
  @UseGuards(JwtAuthGuard, RolesGuard, AssignedProfessorGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Firma para subir una imagen a Cloudinary',
    description: 'Devuelve los parámetros firmados para que el panel suba la imagen directo a Cloudinary ' +
      '(carpeta de la asignatura; JPG, PNG o WEBP; máximo 5 MB). Luego se crea la pregunta con el public_id.',
  })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiResponse({ status: 200, description: '{ upload_url, api_key, timestamp, signature, folder, allowed_formats, max_bytes }' })
  @ApiResponse({ status: 403, description: 'Profesor no asignado a esta asignatura.' })
  imageSignature(@Param('subjectId', ParseObjectIdPipe) subjectId: string) {
    return this.questionsService.signImageUpload(subjectId);
  }

  @Post('image-discard')
  @UseGuards(JwtAuthGuard, RolesGuard, AssignedProfessorGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Descartar una imagen subida sin usar',
    description: 'Borra de Cloudinary una imagen que se subió pero no se guardó en ninguna pregunta (p. ej. al cancelar el formulario).',
  })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  discardImage(
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Body() dto: DiscardImageDto,
  ) {
    return this.questionsService.discardImage(subjectId, dto.public_id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar pregunta',
    description: 'Solo el profesor que creó la pregunta o un admin puede editarla. Si se envían answer_options, reemplaza todas las opciones anteriores.',
  })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiParam({ name: 'id', description: 'ObjectId de la pregunta' })
  @ApiResponse({ status: 200, description: 'Pregunta actualizada.' })
  @ApiResponse({ status: 403, description: 'Solo el creador o admin puede editar.' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
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
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiParam({ name: 'id', description: 'ObjectId de la pregunta' })
  @ApiResponse({ status: 200, description: 'Pregunta eliminada.' })
  @ApiResponse({ status: 403, description: 'Solo el creador o admin puede eliminar.' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.questionsService.remove(id, user);
  }
}
