import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions, embeddedSchemaOptions } from '../common/mongoose/schema-options';

export type GameDocument = HydratedDocument<Game>;

export enum GameStatus {
  /** Se está jugando (se autoguarda en cada turno). */
  IN_PROGRESS = 'in_progress',
  /** El host la guardó para retomarla después. */
  SAVED = 'saved',
  /** Terminó: tiene resultados y ya no guarda estado. */
  FINISHED = 'finished',
}

/** Asiento de la partida: quién juega en cada posición del tablero. */
@Schema(embeddedSchemaOptions)
export class GamePlayer {
  @Prop({ required: true, min: 0, max: 3 })
  seat: number;

  /** Código de estudiante o correo, normalizado en minúsculas. */
  @Prop({ required: true, maxlength: 150, lowercase: true, trim: true })
  student_id: string;

  @Prop({ required: true, maxlength: 50, trim: true })
  nickname: string;
}

export const GamePlayerSchema = SchemaFactory.createForClass(GamePlayer);

/** Resultado final de un jugador (lo calcula el backend a partir de sus estadísticas). */
@Schema(embeddedSchemaOptions)
export class GameResult {
  @Prop({ required: true }) seat: number;
  @Prop({ required: true, lowercase: true, trim: true }) student_id: string;
  @Prop({ required: true }) nickname: string;

  @Prop({ required: true }) credits: number;
  /** Créditos + valor de sus propiedades + casas y hoteles construidos. */
  @Prop({ required: true }) net_worth: number;
  @Prop({ required: true, min: 0 }) properties: number;
  @Prop({ required: true, min: 0 }) correct: number;
  @Prop({ required: true, min: 0 }) wrong: number;
  @Prop({ default: false }) abandoned: boolean;

  /** Nota de 1 a 5 (un decimal). */
  @Prop({ required: true }) score: number;
  /** Rendimiento frente al mejor jugador de la partida (el mejor = 100). */
  @Prop({ required: true }) rating_pct: number;
  /** Puesto (1 = primero; empates comparten puesto). */
  @Prop({ required: true }) rank: number;
}

export const GameResultSchema = SchemaFactory.createForClass(GameResult);

@Schema(baseSchemaOptions('games'))
export class Game {
  @Prop({ required: true, maxlength: 20, trim: true })
  room_code: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', default: null })
  subject_id: Types.ObjectId;

  @Prop({ default: null, maxlength: 100 })
  subject_name: string;

  @Prop({ default: null })
  level: string;

  /** Categoría jugada; null = todas las categorías de la asignatura. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null })
  category_id: Types.ObjectId | null;

  @Prop({ type: String, default: null, maxlength: 60 })
  category_name: string | null;

  @Prop({ required: true, type: String, enum: GameStatus, default: GameStatus.IN_PROGRESS, index: true })
  status: GameStatus;

  @Prop({ required: true, lowercase: true, trim: true })
  host_student_id: string;

  @Prop({ type: [GamePlayerSchema], default: [] })
  players: GamePlayer[];

  /**
   * Estado completo del tablero que envía el juego (EstadoPartida en Unity).
   * El backend no lo interpreta: lo guarda y lo devuelve tal cual al retomar.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  state: Record<string, unknown> | null;

  /** Aumenta con cada guardado; permite detectar escrituras desordenadas. */
  @Prop({ default: 0 })
  state_version: number;

  @Prop({ type: Date, default: null })
  saved_at: Date;

  @Prop({ type: Date, default: null })
  finished_at: Date;

  @Prop({ type: [GameResultSchema], default: [] })
  results: GameResult[];

  /**
   * Hash del token que autoriza a escribir en esta partida (lo tiene solo el host).
   * Los estudiantes no tienen cuenta: así nadie más puede modificarla.
   */
  @Prop({ required: true, select: false })
  token_hash: string;

  created_at: Date;
}

export const GameSchema = SchemaFactory.createForClass(Game);

/** Buscar las partidas pendientes de un estudiante y el historial por estudiante. */
GameSchema.index({ 'players.student_id': 1, status: 1 });

// El token nunca sale del backend, aunque se pida explícitamente
GameSchema.set('toJSON', {
  ...(GameSchema.get('toJSON') as object),
  transform: (_doc: unknown, ret: Record<string, any>) => {
    delete ret._id;
    delete ret.__v;
    delete ret.token_hash;
    return ret;
  },
});
