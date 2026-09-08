import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions, embeddedSchemaOptions } from '../common/mongoose/schema-options';

export type SubjectDocument = HydratedDocument<Subject>;

/**
 * Asignación profesor ↔ asignatura.
 * Antes era la tabla `subject_professors`; al ser una lista corta y siempre
 * consultada junto a la asignatura, se embebe en el documento.
 */
@Schema(embeddedSchemaOptions)
export class SubjectProfessor {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  professor_id: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  assigned_at: Date;
}

export const SubjectProfessorSchema = SchemaFactory.createForClass(SubjectProfessor);

/** Equivalente a la relación `professor` de la entidad anterior. */
SubjectProfessorSchema.virtual('professor', {
  ref: 'User',
  localField: 'professor_id',
  foreignField: '_id',
  justOne: true,
});

@Schema(baseSchemaOptions('subjects'))
export class Subject {
  @Prop({ required: true, maxlength: 100, trim: true })
  name: string;

  @Prop({ default: null })
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  created_by: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Grade', default: null })
  grade_id: Types.ObjectId;

  @Prop({ type: [SubjectProfessorSchema], default: [] })
  subject_professors: SubjectProfessor[];

  created_at: Date;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);

/**
 * Un nombre de asignatura solo es único dentro de su grado: dos grados
 * distintos pueden tener "Matemáticas".
 */
SubjectSchema.index({ name: 1, grade_id: 1 }, { unique: true });

/** Objeto completo del grado, sin perder `grade_id` como identificador plano. */
SubjectSchema.virtual('grade', {
  ref: 'Grade',
  localField: 'grade_id',
  foreignField: '_id',
  justOne: true,
});
