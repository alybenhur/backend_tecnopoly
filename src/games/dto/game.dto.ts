import {
  IsString,
  IsInt,
  IsEnum,
  IsIn,
  IsOptional,
  IsBoolean,
  IsObject,
  IsMongoId,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionLevel } from '../../common/enums/question-level.enum';
import { GameStatus } from '../../schemas/game.schema';

const normalizeId = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class GamePlayerDto {
  @ApiProperty({ example: 0, description: 'Posición del jugador en el tablero (0 a 3)' })
  @IsInt() @Min(0) @Max(3)
  seat: number;

  @ApiProperty({ example: '1002345678', description: 'Código de estudiante o correo' })
  @Transform(normalizeId)
  @IsString() @MinLength(1) @MaxLength(150)
  student_id: string;

  @ApiProperty({ example: 'Ana', description: 'Apodo usado en la partida' })
  @IsString() @MinLength(1) @MaxLength(50)
  nickname: string;
}

export class CreateGameDto {
  @ApiProperty({ example: 'K7P2QX', description: 'Código de la sala de Photon' })
  @IsString() @MinLength(1) @MaxLength(20)
  room_code: string;

  @ApiPropertyOptional({ description: 'ObjectId de la asignatura' })
  @IsOptional() @IsMongoId()
  subject_id?: string;

  @ApiPropertyOptional({ example: 'Tecnología' })
  @IsOptional() @IsString() @MaxLength(100)
  subject_name?: string;

  @ApiPropertyOptional({ enum: QuestionLevel })
  @IsOptional() @IsEnum(QuestionLevel)
  level?: QuestionLevel;

  @ApiProperty({ example: '1002345678', description: 'Estudiante que creó la sala (host)' })
  @Transform(normalizeId)
  @IsString() @MinLength(1) @MaxLength(150)
  host_student_id: string;

  @ApiProperty({ type: [GamePlayerDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4)
  @ValidateNested({ each: true }) @Type(() => GamePlayerDto)
  players: GamePlayerDto[];
}

/** Operaciones de escritura: requieren el token que se entregó al crear o retomar la partida. */
export class GameTokenDto {
  @ApiProperty({ description: 'Token de la partida (lo tiene solo el host)' })
  @IsString() @MinLength(10) @MaxLength(100)
  game_token: string;
}

export class SaveStateDto extends GameTokenDto {
  @ApiProperty({ description: 'Estado completo del tablero (EstadoPartida de Unity)' })
  @IsObject()
  state: Record<string, unknown>;

  @ApiPropertyOptional({ enum: [GameStatus.IN_PROGRESS, GameStatus.SAVED], default: GameStatus.IN_PROGRESS,
    description: 'in_progress = autoguardado; saved = el host la guardó para retomarla' })
  @IsOptional() @IsIn([GameStatus.IN_PROGRESS, GameStatus.SAVED])
  status?: GameStatus.IN_PROGRESS | GameStatus.SAVED;

  @ApiPropertyOptional({ type: [GamePlayerDto], description: 'Asientos actualizados (p. ej. al retomar con otros apodos)' })
  @IsOptional() @IsArray() @ArrayMaxSize(4)
  @ValidateNested({ each: true }) @Type(() => GamePlayerDto)
  players?: GamePlayerDto[];
}

export class PlayerStatsDto extends GamePlayerDto {
  @ApiProperty({ example: 1350 }) @IsInt()
  credits: number;

  @ApiProperty({ example: 1800, description: 'Créditos + valor de propiedades + construcciones' }) @IsInt()
  net_worth: number;

  @ApiProperty({ example: 3 }) @IsInt() @Min(0)
  properties: number;

  @ApiProperty({ example: 8 }) @IsInt() @Min(0)
  correct: number;

  @ApiProperty({ example: 2 }) @IsInt() @Min(0)
  wrong: number;

  @ApiPropertyOptional({ default: false, description: 'Salió de la partida antes de terminar' })
  @IsOptional() @IsBoolean()
  abandoned?: boolean;
}

export class FinishGameDto extends GameTokenDto {
  @ApiProperty({ type: [PlayerStatsDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4)
  @ValidateNested({ each: true }) @Type(() => PlayerStatsDto)
  players: PlayerStatsDto[];
}

export class ResumeGameDto {
  @ApiProperty({ example: '1002345678', description: 'Estudiante que retoma (debe haber jugado esa partida)' })
  @Transform(normalizeId)
  @IsString() @MinLength(1) @MaxLength(150)
  student_id: string;
}

export class StudentQueryDto {
  @ApiProperty({ example: '1002345678' })
  @Transform(normalizeId)
  @IsString() @MinLength(1) @MaxLength(150)
  student_id: string;
}

export class GamesFilterDto {
  @ApiPropertyOptional({ description: 'Filtrar por estudiante' })
  @IsOptional() @Transform(normalizeId) @IsString() @MaxLength(150)
  student_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por asignatura' })
  @IsOptional() @IsMongoId()
  subject_id?: string;

  @ApiPropertyOptional({ enum: GameStatus, default: GameStatus.FINISHED })
  @IsOptional() @IsEnum(GameStatus)
  status?: GameStatus;
}
