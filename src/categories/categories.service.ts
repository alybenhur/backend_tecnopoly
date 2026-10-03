import {
  BadRequestException, ConflictException, Injectable,
  Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  Category, CategoryDocument, CATEGORY_NAME_COLLATION,
} from '../schemas/category.schema';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { Subject, SubjectDocument } from '../schemas/subject.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ensureDefaultCategory } from './default-category';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    @InjectModel(Subject.name)  private subjectModel:  Model<SubjectDocument>,
  ) {}

  /**
   * Al arrancar:
   *  - crea el índice único (en producción autoIndex está apagado);
   *  - cada asignatura sin categorías recibe "General";
   *  - las preguntas sin categoría pasan a la "General" de su asignatura.
   * Es idempotente: si no hay nada pendiente no hace cambios.
   */
  async onModuleInit() {
    try {
      await this.categoryModel.createIndexes();

      const withCategories = await this.categoryModel.distinct('subject_id');
      const subjectsWithout = await this.subjectModel
        .find({ _id: { $nin: withCategories } })
        .select('_id');
      for (const s of subjectsWithout) await ensureDefaultCategory(this.categoryModel, s._id);

      const orphanSubjects = await this.questionModel.distinct('subject_id', { category_id: null });
      let moved = 0;
      for (const subjectId of orphanSubjects) {
        const general = await ensureDefaultCategory(this.categoryModel, subjectId);
        const r = await this.questionModel.updateMany(
          { subject_id: subjectId, category_id: null },
          { $set: { category_id: general._id } },
        );
        moved += r.modifiedCount;
      }

      if (subjectsWithout.length || moved)
        this.logger.log(`Categorías: ${subjectsWithout.length} asignaturas con "General" nueva, ${moved} preguntas asignadas`);
    } catch (err) {
      // No impide arrancar: se reintenta en el próximo inicio
      this.logger.error(`No se pudo completar la migración de categorías: ${err}`);
    }
  }

  private async verifySubject(subjectId: string) {
    const exists = await this.subjectModel.exists({ _id: subjectId });
    if (!exists) throw new NotFoundException(`Asignatura con id ${subjectId} no encontrada`);
  }

  private async verifyCategory(subjectId: string, id: string) {
    const c = await this.categoryModel.findOne({ _id: id, subject_id: subjectId });
    if (!c) throw new NotFoundException(`Categoría con id ${id} no encontrada en esta asignatura`);
    return c;
  }

  private async assertNameAvailable(subjectId: string, name: string, exceptId?: string) {
    const filter: QueryFilter<CategoryDocument> = { subject_id: subjectId, name: name.trim() };
    if (exceptId) filter._id = { $ne: exceptId };
    const dup = await this.categoryModel.findOne(filter).collation(CATEGORY_NAME_COLLATION).select('_id');
    if (dup) throw new ConflictException(`Ya existe una categoría llamada "${name.trim()}" en esta asignatura`);
  }

  /** Categorías de la asignatura con cuántas preguntas tiene cada una. */
  async findAllBySubject(subjectId: string) {
    await this.verifySubject(subjectId);

    const categories = await this.categoryModel
      .find({ subject_id: subjectId })
      .collation(CATEGORY_NAME_COLLATION)
      .sort({ name: 1 });

    const counts = await this.questionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { subject_id: new Types.ObjectId(subjectId) } },
      { $group: { _id: '$category_id', count: { $sum: 1 } } },
    ]);
    const byId = new Map(counts.map(c => [String(c._id), c.count]));

    return categories.map(c => ({ ...c.toJSON(), question_count: byId.get(c.id) ?? 0 }));
  }

  async create(subjectId: string, dto: CreateCategoryDto, userId: string) {
    await this.verifySubject(subjectId);
    await this.assertNameAvailable(subjectId, dto.name);

    const created = await this.categoryModel.create({
      subject_id:  subjectId,
      name:        dto.name.trim(),
      description: dto.description?.trim() || null,
      created_by:  userId,
    });
    return { ...created.toJSON(), question_count: 0 };
  }

  async update(subjectId: string, id: string, dto: UpdateCategoryDto) {
    await this.verifyCategory(subjectId, id);
    if (dto.name) await this.assertNameAvailable(subjectId, dto.name, id);

    const changes: Record<string, unknown> = {};
    if (dto.name !== undefined) changes.name = dto.name.trim();
    if (dto.description !== undefined) changes.description = dto.description.trim() || null;

    const updated = await this.categoryModel.findByIdAndUpdate(id, changes, { returnDocument: 'after' });
    const count = await this.questionModel.countDocuments({ category_id: id });
    return { ...updated!.toJSON(), question_count: count };
  }

  /** Solo se elimina si está vacía: así no se pierden preguntas por error. */
  async remove(subjectId: string, id: string) {
    const category = await this.verifyCategory(subjectId, id);

    const count = await this.questionModel.countDocuments({ category_id: id });
    if (count > 0)
      throw new ConflictException(
        `La categoría "${category.name}" tiene ${count} pregunta(s). Muévelas a otra categoría o elimínalas antes de borrarla.`,
      );

    await this.categoryModel.findByIdAndDelete(id);
    return { message: `Categoría "${category.name}" eliminada correctamente` };
  }

  /** Para preguntas: la categoría debe existir y ser de la misma asignatura. */
  async assertBelongsToSubject(subjectId: string, categoryId: string) {
    const ok = await this.categoryModel.exists({ _id: categoryId, subject_id: subjectId });
    if (!ok) throw new BadRequestException('La categoría no existe o no pertenece a esta asignatura');
  }
}
