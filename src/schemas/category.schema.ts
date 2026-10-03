import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions } from '../common/mongoose/schema-options';

export type CategoryDocument = HydratedDocument<Category>;

/** Nombre de la categoría que se crea en cada asignatura para las preguntas sin categoría. */
export const DEFAULT_CATEGORY_NAME = 'General';

/** Colación de MongoDB que compara texto ignorando mayúsculas y acentos. */
export const CATEGORY_NAME_COLLATION = { locale: 'es', strength: 1 } as const;

/** Categoría de preguntas dentro de una asignatura (p. ej. "Hardware", "Redes"). */
@Schema(baseSchemaOptions('categories'))
export class Category {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject_id: Types.ObjectId;

  @Prop({ required: true, maxlength: 60, trim: true })
  name: string;

  @Prop({ type: String, default: null, maxlength: 300 })
  description: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  created_by: Types.ObjectId;

  created_at: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

/** El nombre es único dentro de la asignatura, sin distinguir mayúsculas ni acentos. */
CategorySchema.index(
  { subject_id: 1, name: 1 },
  { unique: true, collation: CATEGORY_NAME_COLLATION },
);
