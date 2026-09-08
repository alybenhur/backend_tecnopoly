import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Valida que el parámetro sea un ObjectId de MongoDB.
 * Sustituye al ParseUUIDPipe que se usaba con MySQL.
 *
 * Se valida contra la expresión regular y no con `Types.ObjectId.isValid`,
 * porque esta última acepta cualquier cadena de 12 caracteres.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!OBJECT_ID_REGEX.test(value)) {
      throw new BadRequestException(`"${value}" no es un id válido`);
    }
    return value;
  }
}
