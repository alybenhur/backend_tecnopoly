import { IsString, MinLength, MaxLength, IsOptional, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'Fundamentos de Computación', description: 'Nuevo nombre de la asignatura' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Descripción actualizada.', description: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '6650f1c2a4b3d2e1a0123457', description: 'ID del grado al que reasignar la asignatura' })
  @IsOptional()
  @IsMongoId()
  grade_id?: string;
}
