import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({ example: 'Primer Grado', description: 'Nombre del grado' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Grado inicial de primaria', description: 'Descripción del grado' })
  @IsString()
  @IsOptional()
  description?: string;
}
