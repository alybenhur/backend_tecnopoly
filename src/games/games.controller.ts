import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
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
import { GamesService } from './games.service';
import {
  CreateGameDto,
  SaveStateDto,
  FinishGameDto,
  ResumeGameDto,
  StudentQueryDto,
  GamesFilterDto,
} from './dto/game.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

/**
 * Partidas del juego. Los estudiantes no tienen cuenta: se identifican con su
 * código o correo, y las escrituras se autorizan con el token de la partida
 * que solo conoce el host. La consulta de resultados de todos es para profesores.
 */
@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // =========================================================================
  // Rutas que usa el juego
  // =========================================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear partida', description: 'El host la crea al empezar. Devuelve el id y el token de la partida.' })
  @ApiResponse({ status: 201, description: '{ id, game_token }' })
  create(@Body() dto: CreateGameDto) {
    return this.gamesService.create(dto);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Partidas guardadas de un estudiante', description: 'Partidas sin terminar en las que participó (sin el estado del tablero).' })
  findPending(@Query() query: StudentQueryDto) {
    return this.gamesService.findPendingForStudent(query.student_id);
  }

  @Put(':id/state')
  @ApiOperation({ summary: 'Guardar estado', description: 'Autoguardado (in_progress) o guardar para retomar después (saved). Requiere game_token.' })
  @ApiParam({ name: 'id', description: 'ObjectId de la partida' })
  @ApiResponse({ status: 403, description: 'Token inválido.' })
  @ApiResponse({ status: 409, description: 'La partida ya terminó.' })
  saveState(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: SaveStateDto) {
    return this.gamesService.saveState(id, dto);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retomar partida', description: 'Devuelve el estado guardado y un token nuevo; quien retoma pasa a ser el host.' })
  @ApiParam({ name: 'id', description: 'ObjectId de la partida' })
  @ApiResponse({ status: 403, description: 'El estudiante no jugó esta partida.' })
  @ApiResponse({ status: 409, description: 'La partida ya terminó.' })
  resume(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ResumeGameDto) {
    return this.gamesService.resume(id, dto.student_id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminar partida', description: 'Recibe las estadísticas de cada jugador, calcula nota (1–5), valoración (%) y puesto. Idempotente.' })
  @ApiParam({ name: 'id', description: 'ObjectId de la partida' })
  @ApiResponse({ status: 403, description: 'Token inválido.' })
  finish(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: FinishGameDto) {
    return this.gamesService.finish(id, dto);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Resultados de una partida terminada' })
  @ApiParam({ name: 'id', description: 'ObjectId de la partida' })
  @ApiResponse({ status: 409, description: 'La partida aún no ha terminado.' })
  getResults(@Param('id', ParseObjectIdPipe) id: string) {
    return this.gamesService.getResults(id);
  }

  // =========================================================================
  // Rutas PROTEGIDAS — profesores y admin
  // =========================================================================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESOR, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar partidas y resultados', description: 'Filtra por estudiante, asignatura y estado (por defecto, terminadas).' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  findAll(@Query() filter: GamesFilterDto) {
    return this.gamesService.findAll(filter);
  }
}
