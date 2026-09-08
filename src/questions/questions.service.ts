import {
  Injectable, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel }      from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { CreateQuestionDto, AnswerOptionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionLevel }    from '../common/enums/question-level.enum';
import { Role }             from '../common/enums/role.enum';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
  ) {}

  private async verifyQuestion(id: string) {
    const q = await this.questionModel.findById(id);
    if (!q) throw new NotFoundException(`Pregunta con id ${id} no encontrada`);
    return q;
  }

  /**
   * Antes lo garantizaba el UNIQUE(question_id, order_index) de MySQL;
   * con las opciones embebidas hay que comprobarlo aquí.
   */
  private normalizeOptions(options: AnswerOptionDto[]) {
    const indexes = new Set(options.map(o => o.order_index));
    if (indexes.size !== options.length)
      throw new BadRequestException('Hay opciones con el mismo order_index');

    return [...options].sort((a, b) => a.order_index - b.order_index);
  }

  private assertCorrectIndex(correctIndex: number, total: number) {
    if (correctIndex >= total)
      throw new BadRequestException(
        `correct_answer_index (${correctIndex}) excede el número de opciones (${total})`,
      );
  }

  async create(subjectId: string, dto: CreateQuestionDto, professorId: string) {
    const { answer_options, ...qData } = dto;

    const options = this.normalizeOptions(answer_options);
    this.assertCorrectIndex(dto.correct_answer_index, options.length);

    return this.questionModel.create({
      ...qData,
      subject_id:     subjectId,
      created_by:     professorId,
      answer_options: options,
    });
  }

  async findAllBySubject(subjectId: string, level?: QuestionLevel) {
    const filter: QueryFilter<QuestionDocument> = { subject_id: subjectId };
    if (level) filter.level = level;

    return this.questionModel.find(filter).sort({ created_at: -1 });
  }

  async findOne(id: string) {
    return this.verifyQuestion(id);
  }

  async update(id: string, dto: UpdateQuestionDto, user: { id: string; role: string }) {
    const question = await this.verifyQuestion(id);

    if (user.role !== Role.ADMIN && question.created_by?.toString() !== user.id)
      throw new ForbiddenException('Solo puedes editar las preguntas que tú creaste');

    const { answer_options, ...qData } = dto;

    const options = answer_options ? this.normalizeOptions(answer_options) : undefined;
    const totalOptions = options?.length ?? question.answer_options.length;
    const correctIndex = dto.correct_answer_index ?? question.correct_answer_index;
    this.assertCorrectIndex(correctIndex, totalOptions);

    const updated = await this.questionModel.findByIdAndUpdate(
      id,
      // Enviar la lista completa reemplaza las opciones anteriores.
      options ? { ...qData, answer_options: options } : qData,
      { new: true },
    );

    if (!updated) throw new NotFoundException(`Pregunta con id ${id} no encontrada`);
    return updated;
  }

  async remove(id: string, user: { id: string; role: string }) {
    const question = await this.verifyQuestion(id);

    if (user.role !== Role.ADMIN && question.created_by?.toString() !== user.id)
      throw new ForbiddenException('Solo puedes eliminar las preguntas que tú creaste');

    await this.questionModel.findByIdAndDelete(id);
    return { message: `Pregunta con id ${id} eliminada correctamente` };
  }
}
