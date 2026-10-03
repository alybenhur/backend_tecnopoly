import { Model, Types } from 'mongoose';
import {
  CategoryDocument,
  CATEGORY_NAME_COLLATION,
  DEFAULT_CATEGORY_NAME,
} from '../schemas/category.schema';

/**
 * Devuelve la categoría "General" de la asignatura, creándola si no existe.
 * Es idempotente y segura si dos instancias del backend la piden a la vez
 * (el índice único resuelve la carrera y se relee la que ganó).
 */
export async function ensureDefaultCategory(
  model: Model<CategoryDocument>,
  subjectId: string | Types.ObjectId,
): Promise<CategoryDocument> {
  const filter = { subject_id: subjectId, name: DEFAULT_CATEGORY_NAME };
  try {
    const doc = await model
      .findOneAndUpdate(filter, { $setOnInsert: { ...filter, description: null } }, { upsert: true, returnDocument: 'after' })
      .collation(CATEGORY_NAME_COLLATION);
    if (doc) return doc;
  } catch (err: any) {
    if (err?.code !== 11000) throw err; // otra instancia la creó en ese instante
  }
  const existing = await model.findOne(filter).collation(CATEGORY_NAME_COLLATION);
  if (!existing) throw new Error(`No se pudo crear la categoría ${DEFAULT_CATEGORY_NAME}`);
  return existing;
}
