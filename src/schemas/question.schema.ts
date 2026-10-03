import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { QuestionLevel } from '../common/enums/question-level.enum';
import { QuestionType } from '../common/enums/question-type.enum';
import { baseSchemaOptions, embeddedSchemaOptions } from '../common/mongoose/schema-options';

export type QuestionDocument = HydratedDocument<Question>;

/** Antes tabla `answer_options`; ahora subdocumento de la pregunta. */
@Schema(embeddedSchemaOptions)
export class AnswerOption {
  @Prop({ required: true, maxlength: 300 })
  option_text: string;

  @Prop({ required: true, min: 0 })
  order_index: number;
}

export const AnswerOptionSchema = SchemaFactory.createForClass(AnswerOption);

@Schema(baseSchemaOptions('questions'))
export class Question {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subject', required: true, index: true })
  subject_id: Types.ObjectId;

  /** Categoría dentro de la asignatura (las preguntas antiguas se migraron a "General"). */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', required: true, index: true })
  category_id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  created_by: Types.ObjectId;

  @Prop({ required: true })
  question_text: string;

  @Prop({ required: true, min: 0 })
  correct_answer_index: number;

  @Prop({ default: 100, min: 0 })
  reward_credits: number;

  @Prop({ default: 50, min: 0 })
  penalty_credits: number;

  @Prop({ required: true })
  correct_explanation: string;

  @Prop({ required: true })
  incorrect_explanation: string;

  @Prop({ required: true, type: String, enum: QuestionLevel })
  level: QuestionLevel;

  /** text: solo enunciado; image: se muestra la imagen y el enunciado pregunta sobre ella. */
  @Prop({ type: String, enum: QuestionType, default: QuestionType.TEXT })
  question_type: QuestionType;

  @Prop({ type: String, default: null })
  image_url: string | null;

  /** Id de la imagen en Cloudinary (para borrarla al cambiarla o eliminar la pregunta). */
  @Prop({ type: String, default: null })
  image_public_id: string | null;

  @Prop({ type: [AnswerOptionSchema], default: [] })
  answer_options: AnswerOption[];

  created_at: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
