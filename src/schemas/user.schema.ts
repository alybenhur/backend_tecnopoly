import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { baseSchemaOptions } from '../common/mongoose/schema-options';

export type UserDocument = HydratedDocument<User>;

@Schema(baseSchemaOptions('users'))
export class User {
  @Prop({ required: true, maxlength: 100, trim: true })
  name: string;

  @Prop({ required: true, unique: true, maxlength: 150, lowercase: true, trim: true })
  email: string;

  /** Nunca se devuelve: `select: false` lo excluye de las consultas por defecto. */
  @Prop({ required: true, select: false })
  password_hash: string;

  @Prop({ required: true, type: String, enum: Role })
  role: Role;

  created_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
