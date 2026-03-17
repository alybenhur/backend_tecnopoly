import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
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
}
