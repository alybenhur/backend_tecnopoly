import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';
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

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID del grado al que reasignar la asignatura' })
  @IsOptional()
  @IsUUID()
  grade_id?: string;
}
