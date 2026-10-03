import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Hardware', description: 'Nombre de la categoría (único dentro de la asignatura)' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'Componentes físicos del computador', description: 'Descripción opcional' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Hardware y periféricos', description: 'Nuevo nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ example: 'Componentes físicos y periféricos', description: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
