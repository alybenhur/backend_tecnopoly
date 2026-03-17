import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignProfessorDto } from './dto/assign-professor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // =========================================================================
  // Rutas PÚBLICAS
  // =========================================================================

  @Get()
  @ApiOperation({ summary: 'Listar asignaturas', description: 'Devuelve todas las asignaturas con sus profesores asignados. Acceso público.' })
  @ApiResponse({ status: 200, description: 'Lista de asignaturas.' })
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener asignatura por ID', description: 'Devuelve el detalle de una asignatura con sus profesores. Acceso público.' })
  @ApiParam({ name: 'id', description: 'UUID de la asignatura' })
  @ApiResponse({ status: 200, description: 'Detalle de la asignatura.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectsService.findOne(id);
  }

  @Get(':id/professors')
  @ApiOperation({ summary: 'Listar profesores de una asignatura', description: 'Devuelve los profesores asignados a la asignatura. Acceso público.' })
  @ApiParam({ name: 'id', description: 'UUID de la asignatura' })
  @ApiResponse({ status: 200, description: 'Lista de profesores asignados.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  getProfessors(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectsService.getProfessors(id);
  }

  // =========================================================================
  // Rutas PROTEGIDAS — solo Admin
  // =========================================================================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear asignatura', description: 'El admin crea una nueva asignatura.' })
  @ApiResponse({ status: 201, description: 'Asignatura creada exitosamente.' })
  @ApiResponse({ status: 409, description: 'Ya existe una asignatura con ese nombre.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos (solo admin).' })
  create(
    @Body() createSubjectDto: CreateSubjectDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.subjectsService.create(createSubjectDto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar asignatura', description: 'El admin actualiza el nombre o descripción de una asignatura.' })
  @ApiParam({ name: 'id', description: 'UUID de la asignatura' })
  @ApiResponse({ status: 200, description: 'Asignatura actualizada.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  @ApiResponse({ status: 409, description: 'El nombre ya está en uso.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos (solo admin).' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(id, updateSubjectDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar asignatura', description: 'El admin elimina una asignatura y sus relaciones en cascada.' })
  @ApiParam({ name: 'id', description: 'UUID de la asignatura' })
  @ApiResponse({ status: 200, description: 'Asignatura eliminada.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos (solo admin).' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subjectsService.remove(id);
  }

  @Post(':id/professors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Asignar profesor a asignatura', description: 'El admin asigna un profesor a la asignatura.' })
  @ApiParam({ name: 'id', description: 'UUID de la asignatura' })
  @ApiResponse({ status: 201, description: 'Profesor asignado correctamente.' })
  @ApiResponse({ status: 404, description: 'Asignatura o profesor no encontrado.' })
  @ApiResponse({ status: 409, description: 'El profesor ya está asignado.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos (solo admin).' })
  assignProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProfessorDto,
  ) {
    return this.subjectsService.assignProfessor(id, dto);
  }

  @Delete(':id/professors/:professorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Desasignar profesor de asignatura', description: 'El admin elimina la asignación de un profesor a la asignatura.' })
  @ApiParam({ name: 'id', description: 'UUID de la asignatura' })
  @ApiParam({ name: 'professorId', description: 'UUID del profesor' })
  @ApiResponse({ status: 200, description: 'Profesor desasignado.' })
  @ApiResponse({ status: 404, description: 'Asignación no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos (solo admin).' })
  removeProfessor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('professorId', ParseUUIDPipe) professorId: string,
  ) {
    return this.subjectsService.removeProfessor(id, professorId);
  }
}
