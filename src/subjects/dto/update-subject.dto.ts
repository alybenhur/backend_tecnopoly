import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
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
}
