import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('categories')
@Controller('subjects/:subjectId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar categorías de una asignatura',
    description: 'Devuelve las categorías con la cantidad de preguntas de cada una (question_count). Acceso público.',
  })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiResponse({ status: 200, description: 'Lista de categorías.' })
  @ApiResponse({ status: 404, description: 'Asignatura no encontrada.' })
  findAll(@Param('subjectId', ParseObjectIdPipe) subjectId: string) {
    return this.categoriesService.findAllBySubject(subjectId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, AssignedProfessorGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear categoría', description: 'El admin o un profesor asignado a la asignatura crea una categoría.' })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiResponse({ status: 201, description: 'Categoría creada.' })
  @ApiResponse({ status: 403, description: 'Profesor no asignado a esta asignatura.' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con ese nombre.' })
  create(
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.categoriesService.create(subjectId, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AssignedProfessorGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Renombrar categoría', description: 'El admin o un profesor asignado cambia el nombre o la descripción.' })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiParam({ name: 'id', description: 'ObjectId de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada.' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con ese nombre.' })
  update(
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(subjectId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, AssignedProfessorGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar categoría', description: 'Solo se puede eliminar si no tiene preguntas.' })
  @ApiParam({ name: 'subjectId', description: 'ObjectId de la asignatura' })
  @ApiParam({ name: 'id', description: 'ObjectId de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría eliminada.' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada.' })
  @ApiResponse({ status: 409, description: 'La categoría tiene preguntas.' })
  remove(
    @Param('subjectId', ParseObjectIdPipe) subjectId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.categoriesService.remove(subjectId, id);
  }
}
