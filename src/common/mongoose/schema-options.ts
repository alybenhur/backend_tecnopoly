import { SchemaOptions } from '@nestjs/mongoose';

/**
 * Opciones compartidas por todos los esquemas.
 *
 * - `created_at` lo gestiona mongoose (equivalente al @CreateDateColumn anterior).
 * - La serialización expone `id` (string) en lugar de `_id`, oculta `__v`
 *   y nunca deja escapar el hash de la contraseña.
 */
export const baseSchemaOptions = (collection: string): SchemaOptions => ({
  collection,
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      delete ret._id;
      delete ret.__v;
      delete ret.password_hash;
      return ret;
    },
  },
  toObject: { virtuals: true },
});

/** Igual que `baseSchemaOptions` pero para subdocumentos embebidos (sin colección ni fechas). */
export const embeddedSchemaOptions: SchemaOptions = {
  _id: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
};
