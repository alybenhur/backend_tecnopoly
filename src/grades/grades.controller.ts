import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
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
import { GradesService }    from './grades.service';
import { CreateGradeDto }   from './dto/create-grade.dto';
import { UpdateGradeDto }   from './dto/update-grade.dto';
import { JwtAuthGuard }     from '../common/guards/jwt-auth.guard';
import { RolesGuard }       from '../common/guards/roles.guard';
import { Roles }            from '../common/decorators/roles.decorator';
import { CurrentUser }      from '../common/decorators/current-user.decorator';
import { Role }             from '../common/enums/role.enum';

@ApiTags('grades')
@Controller('grades')
export class GradesController {
  constructor(private gradesService: GradesService) {}

  // ── POST /api/grades ─── Admin crea grado ─────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear grado (solo Admin)' })
  @ApiResponse({ status: 201, description: 'Grado creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe un grado con ese nombre' })
  create(
    @Body() createGradeDto: CreateGradeDto,
    @CurrentUser() user: any,
  ) {
    return this.gradesService.create(createGradeDto, user.id);
  }

  // ── GET /api/grades ─── Público: lista todos los grados ───────────────
  @Get()
  @ApiOperation({ summary: 'Listar todos los grados con sus asignaturas' })
  @ApiResponse({ status: 200, description: 'Lista de grados' })
  findAll() {
    return this.gradesService.findAll();
  }

  // ── GET /api/grades/:id ─── Público: detalle de grado ─────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un grado con sus asignaturas' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Detalle del grado' })
  @ApiResponse({ status: 404, description: 'Grado no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.findOne(id);
  }

  // ── GET /api/grades/:id/subjects ─── Público: asignaturas del grado ───
  @Get(':id/subjects')
  @ApiOperation({ summary: 'Listar asignaturas de un grado específico' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'ID del grado' })
  @ApiResponse({ status: 200, description: 'Asignaturas del grado' })
  @ApiResponse({ status: 404, description: 'Grado no encontrado' })
  findSubjects(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.findSubjectsByGrade(id);
  }

  // ── PUT /api/grades/:id ─── Admin actualiza grado ──────────────────────
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar grado (solo Admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grado actualizado' })
  @ApiResponse({ status: 404, description: 'Grado no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradeDto: UpdateGradeDto,
  ) {
    return this.gradesService.update(id, updateGradeDto);
  }

  // ── DELETE /api/grades/:id ─── Admin elimina grado ─────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar grado (solo Admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grado eliminado' })
  @ApiResponse({ status: 404, description: 'Grado no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.remove(id);
  }
}
