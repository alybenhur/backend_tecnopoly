import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Game, GameDocument, GameStatus } from '../schemas/game.schema';
import {
  CreateGameDto,
  SaveStateDto,
  FinishGameDto,
  GamesFilterDto,
} from './dto/game.dto';
import { computeScores } from './scoring';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(24).toString('base64url');

@Injectable()
export class GamesService {
  constructor(@InjectModel(Game.name) private gameModel: Model<GameDocument>) {}

  /** Crea la partida y entrega el token que el host usará para guardarla. */
  async create(dto: CreateGameDto) {
    const token = newToken();
    const game = await this.gameModel.create({
      ...dto, // sin subject_id queda en null por el default del esquema
      status: GameStatus.IN_PROGRESS,
      token_hash: hashToken(token),
    });
    return { id: game.id, game_token: token };
  }

  /** Autoguardado o "guardar y salir". Solo con el token del host. */
  async saveState(id: string, dto: SaveStateDto) {
    const game = await this.findWithToken(id, dto.game_token);
    if (game.status === GameStatus.FINISHED)
      throw new ConflictException('La partida ya terminó; no se puede guardar su estado');

    game.state = dto.state;
    game.status = dto.status ?? GameStatus.IN_PROGRESS;
    game.state_version += 1;
    game.saved_at = new Date();
    if (dto.players) game.players = dto.players;
    game.markModified('state');
    await game.save();

    return { id: game.id, status: game.status, state_version: game.state_version, saved_at: game.saved_at };
  }

  /**
   * Cierra la partida: calcula nota, valoración y puesto de cada jugador.
   * Es idempotente: si ya terminó devuelve los resultados guardados.
   */
  async finish(id: string, dto: FinishGameDto) {
    const game = await this.findWithToken(id, dto.game_token);
    if (game.status === GameStatus.FINISHED) return this.toResults(game);

    const scores = computeScores(dto.players);
    game.results = dto.players.map((p, i) => ({
      seat: p.seat,
      student_id: p.student_id,
      nickname: p.nickname,
      credits: p.credits,
      net_worth: p.net_worth,
      properties: p.properties,
      correct: p.correct,
      wrong: p.wrong,
      abandoned: p.abandoned ?? false,
      score: scores[i].score,
      rating_pct: scores[i].rating_pct,
      rank: scores[i].rank,
    }));
    game.status = GameStatus.FINISHED;
    game.finished_at = new Date();
    game.state = null; // ya no se puede retomar
    game.markModified('state');
    await game.save();

    return this.toResults(game);
  }

  /** Partidas sin terminar en las que participó el estudiante (para "Partidas guardadas"). */
  async findPendingForStudent(studentId: string) {
    return this.gameModel
      .find({
        'players.student_id': studentId,
        status: { $in: [GameStatus.SAVED, GameStatus.IN_PROGRESS] },
        state: { $ne: null },
      })
      .select('-state -results')
      .sort({ saved_at: -1 })
      .limit(20);
  }

  /**
   * Retoma una partida: devuelve su estado y un token nuevo para quien la retoma,
   * que pasa a ser el host. El token anterior deja de servir.
   */
  async resume(id: string, studentId: string) {
    const game = await this.gameModel.findById(id).select('+token_hash');
    if (!game) throw new NotFoundException(`Partida con id ${id} no encontrada`);
    if (game.status === GameStatus.FINISHED || !game.state)
      throw new ConflictException('Esta partida ya terminó y no se puede retomar');
    if (!game.players.some(p => p.student_id === studentId))
      throw new ForbiddenException('Solo un jugador de esta partida puede retomarla');

    const token = newToken();
    game.token_hash = hashToken(token);
    game.host_student_id = studentId;
    game.status = GameStatus.IN_PROGRESS;
    await game.save();

    return { game: game.toJSON(), game_token: token };
  }

  async getResults(id: string) {
    const game = await this.gameModel.findById(id);
    if (!game) throw new NotFoundException(`Partida con id ${id} no encontrada`);
    if (game.status !== GameStatus.FINISHED)
      throw new ConflictException('La partida aún no ha terminado');
    return this.toResults(game);
  }

  /** Consulta para profesores y admin: partidas (por defecto terminadas) con sus resultados. */
  async findAll(filter: GamesFilterDto) {
    const query: QueryFilter<GameDocument> = { status: filter.status ?? GameStatus.FINISHED };
    if (filter.student_id) query['players.student_id'] = filter.student_id;
    if (filter.subject_id) query.subject_id = filter.subject_id;

    return this.gameModel.find(query).select('-state').sort({ created_at: -1 }).limit(200);
  }

  // ── Helpers ─────────────────────────────────────────────

  private async findWithToken(id: string, token: string) {
    const game = await this.gameModel.findById(id).select('+token_hash');
    if (!game) throw new NotFoundException(`Partida con id ${id} no encontrada`);

    const expected = Buffer.from(game.token_hash, 'hex');
    const given = Buffer.from(hashToken(token), 'hex');
    if (expected.length !== given.length || !timingSafeEqual(expected, given))
      throw new ForbiddenException('Token de partida inválido');
    return game;
  }

  private toResults(game: GameDocument) {
    return {
      id: game.id,
      room_code: game.room_code,
      subject_id: game.subject_id,
      subject_name: game.subject_name,
      level: game.level,
      finished_at: game.finished_at,
      results: [...game.results].sort((a, b) => a.rank - b.rank),
    };
  }
}
