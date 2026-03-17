import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionLevel } from '../../common/enums/question-level.enum';
import { AnswerOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: '¿Cuál medio de almacenamiento es más rápido?', description: 'Nuevo enunciado de la pregunta' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  question_text?: string;

  @ApiPropertyOptional({ type: [AnswerOptionDto], description: 'Nuevas opciones (reemplaza todas las anteriores)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answer_options?: AnswerOptionDto[];

  @ApiPropertyOptional({ example: 1, description: 'Nuevo índice de respuesta correcta' })
  @IsOptional()
  @IsInt()
  @Min(0)
  correct_answer_index?: number;

  @ApiPropertyOptional({ example: 150, description: 'Nuevos créditos de recompensa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reward_credits?: number;

  @ApiPropertyOptional({ example: 75, description: 'Nuevos créditos de penalización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  penalty_credits?: number;

  @ApiPropertyOptional({ example: 'Las SSD usan memoria flash, sin partes móviles.', description: 'Nueva explicación para respuesta correcta' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  correct_explanation?: string;

  @ApiPropertyOptional({ example: 'Respuesta incorrecta. Revisa el tema de almacenamiento.', description: 'Nueva explicación para respuesta incorrecta' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  incorrect_explanation?: string;

  @ApiPropertyOptional({ enum: QuestionLevel, example: QuestionLevel.AVANZADO, description: 'Nuevo nivel de dificultad' })
  @IsOptional()
  @IsEnum(QuestionLevel)
  level?: QuestionLevel;

  @ApiPropertyOptional({ example: 'https://cdn.tecnopoly.com/img/new.png', description: 'Nueva URL de imagen' })
  @IsOptional()
  @IsUrl()
  image_url?: string;
}
