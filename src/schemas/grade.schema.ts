import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions } from '../common/mongoose/schema-options';

export type GradeDocument = HydratedDocument<Grade>;

@Schema(baseSchemaOptions('grades'))
export class Grade {
  @Prop({ required: true, unique: true, maxlength: 100, trim: true })
  name: string;

  @Prop({ default: null })
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  created_by: Types.ObjectId;

  created_at: Date;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);

/**
 * Las asignaturas viven en su propia colección y apuntan al grado con `grade_id`.
 * Este virtual reproduce la relación `grade.subjects` que existía en TypeORM:
 * se rellena con `.populate('subjects')`.
 */
GradeSchema.virtual('subjects', {
  ref: 'Subject',
  localField: '_id',
  foreignField: 'grade_id',
});
