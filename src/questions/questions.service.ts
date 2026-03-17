import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionLevel } from '../common/enums/question-level.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class QuestionsService {
  constructor(private supabaseService: SupabaseService) {}

  // ─── Helper: verificar que la pregunta existe ────────────────────────────
  private async verifyQuestionExists(questionId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select('id, subject_id, created_by')
      .eq('id', questionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Pregunta con id ${questionId} no encontrada`,
      );
    }

    return data;
  }

  // ─── Crear pregunta con sus opciones de respuesta ────────────────────────
  async create(
    subjectId: string,
    createQuestionDto: CreateQuestionDto,
    professorId: string,
  ) {
    const client = this.supabaseService.getClient();
    const { answer_options, ...questionData } = createQuestionDto;

    // Validar que correct_answer_index no exceda el número de opciones
    if (createQuestionDto.correct_answer_index >= answer_options.length) {
      throw new BadRequestException(
        `correct_answer_index (${createQuestionDto.correct_answer_index}) excede el número de opciones disponibles (${answer_options.length})`,
      );
    }

    // 1. Insertar la pregunta
    const { data: newQuestion, error: questionError } = await client
      .from('questions')
      .insert({
        subject_id: subjectId,
        created_by: professorId,
        question_text: questionData.question_text,
        correct_answer_index: questionData.correct_answer_index,
        reward_credits: questionData.reward_credits,
        penalty_credits: questionData.penalty_credits,
        correct_explanation: questionData.correct_explanation,
        incorrect_explanation: questionData.incorrect_explanation,
        level: questionData.level,
        image_url: questionData.image_url ?? null,
      })
      .select('id')
      .single();

    if (questionError || !newQuestion) {
      throw new BadRequestException(questionError?.message ?? 'Error al crear la pregunta');
    }

    // 2. Insertar las opciones de respuesta asociadas
    const optionsToInsert = answer_options.map((opt) => ({
      question_id: newQuestion.id,
      option_text: opt.option_text,
      order_index: opt.order_index,
    }));

    const { error: optionsError } = await client
      .from('answer_options')
      .insert(optionsToInsert);

    if (optionsError) {
      // Revertir: eliminar pregunta creada si las opciones fallan
      await client.from('questions').delete().eq('id', newQuestion.id);
      throw new BadRequestException(optionsError.message);
    }

    // 3. Retornar la pregunta completa con sus opciones
    return this.findOne(newQuestion.id);
  }

  // ─── Obtener todas las preguntas de una asignatura ────────────────────────
  async findAllBySubject(subjectId: string, level?: QuestionLevel) {
    let query = this.supabaseService
      .getClient()
      .from('questions')
      .select(
        `
        id,
        question_text,
        correct_answer_index,
        reward_credits,
        penalty_credits,
        correct_explanation,
        incorrect_explanation,
        level,
        image_url,
        created_at,
        created_by,
        answer_options (
          id,
          option_text,
          order_index
        )
      `,
      )
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (level) {
      query = query.eq('level', level);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Ordenar las opciones por order_index en cada pregunta
    return data?.map((q) => ({
      ...q,
      answer_options: q.answer_options?.sort(
        (a: { order_index: number }, b: { order_index: number }) =>
          a.order_index - b.order_index,
      ),
    }));
  }

  // ─── Obtener una pregunta por ID ─────────────────────────────────────────
  async findOne(questionId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('questions')
      .select(
        `
        id,
        subject_id,
        question_text,
        correct_answer_index,
        reward_credits,
        penalty_credits,
        correct_explanation,
        incorrect_explanation,
        level,
        image_url,
        created_at,
        created_by,
        answer_options (
          id,
          option_text,
          order_index
        )
      `,
      )
      .eq('id', questionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Pregunta con id ${questionId} no encontrada`);
    }

    return {
      ...data,
      answer_options: data.answer_options?.sort(
        (a: { order_index: number }, b: { order_index: number }) =>
          a.order_index - b.order_index,
      ),
    };
  }

  // ─── Actualizar pregunta ─────────────────────────────────────────────────
  async update(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
    requestUser: { id: string; role: string },
  ) {
    const client = this.supabaseService.getClient();
    const question = await this.verifyQuestionExists(questionId);

    // Solo el creador de la pregunta o un admin puede editarla
    if (
      requestUser.role !== Role.ADMIN &&
      question.created_by !== requestUser.id
    ) {
      throw new ForbiddenException(
        'Solo puedes editar las preguntas que tú creaste',
      );
    }

    const { answer_options, ...questionData } = updateQuestionDto;

    // Validar correct_answer_index si se mandan nuevas opciones
    if (
      answer_options &&
      updateQuestionDto.correct_answer_index !== undefined &&
      updateQuestionDto.correct_answer_index >= answer_options.length
    ) {
      throw new BadRequestException(
        `correct_answer_index (${updateQuestionDto.correct_answer_index}) excede el número de opciones disponibles (${answer_options.length})`,
      );
    }

    // 1. Actualizar datos de la pregunta (solo campos enviados)
    if (Object.keys(questionData).length > 0) {
      const { error } = await client
        .from('questions')
        .update(questionData)
        .eq('id', questionId);

      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    // 2. Si se mandan nuevas opciones, reemplazar todas
    if (answer_options && answer_options.length > 0) {
      // Eliminar opciones anteriores
      await client
        .from('answer_options')
        .delete()
        .eq('question_id', questionId);

      // Insertar nuevas opciones
      const optionsToInsert = answer_options.map((opt) => ({
        question_id: questionId,
        option_text: opt.option_text,
        order_index: opt.order_index,
      }));

      const { error: optionsError } = await client
        .from('answer_options')
        .insert(optionsToInsert);

      if (optionsError) {
        throw new BadRequestException(optionsError.message);
      }
    }

    return this.findOne(questionId);
  }

  // ─── Eliminar pregunta ────────────────────────────────────────────────────
  async remove(
    questionId: string,
    requestUser: { id: string; role: string },
  ) {
    const client = this.supabaseService.getClient();
    const question = await this.verifyQuestionExists(questionId);

    // Solo el creador o un admin puede eliminar
    if (
      requestUser.role !== Role.ADMIN &&
      question.created_by !== requestUser.id
    ) {
      throw new ForbiddenException(
        'Solo puedes eliminar las preguntas que tú creaste',
      );
    }

    // Las opciones se eliminan en cascada por FK en la BD
    const { error } = await client
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: `Pregunta con id ${questionId} eliminada correctamente` };
  }
}
