import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Introducción a la Informática', description: 'Nombre de la asignatura' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Conceptos básicos de hardware, software y redes.', description: 'Descripción de la asignatura' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID del grado al que pertenece la asignatura' })
  @IsOptional()
  @IsUUID()
  grade_id?: string;
}
