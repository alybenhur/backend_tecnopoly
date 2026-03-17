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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionLevel } from '../../common/enums/question-level.enum';

export class AnswerOptionDto {
  @ApiProperty({ example: 'Disco Duro (HDD)', description: 'Texto de la opción de respuesta' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  option_text: string;

  @ApiProperty({ example: 0, description: 'Posición de la opción (0-based)' })
  @IsInt()
  @Min(0)
  order_index: number;
}

export class CreateQuestionDto {
  @ApiProperty({
    example: '¿Cuál de estos medios de almacenamiento es típicamente el más rápido?',
    description: 'Enunciado de la pregunta',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  question_text: string;

  @ApiProperty({
    type: [AnswerOptionDto],
    description: 'Lista de opciones de respuesta (mínimo 2, máximo 6)',
    example: [
      { option_text: 'Disco Duro (HDD)', order_index: 0 },
      { option_text: 'Unidad de Estado Sólido (SSD)', order_index: 1 },
      { option_text: 'USB', order_index: 2 },
      { option_text: 'CD-ROM', order_index: 3 },
    ],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answer_options: AnswerOptionDto[];

  @ApiProperty({ example: 1, description: 'Índice (0-based) de la opción correcta' })
  @IsInt()
  @Min(0)
  correct_answer_index: number;

  @ApiProperty({ example: 100, description: 'Créditos otorgados por respuesta correcta' })
  @IsInt()
  @Min(0)
  reward_credits: number;

  @ApiProperty({ example: 50, description: 'Créditos descontados por respuesta incorrecta' })
  @IsInt()
  @Min(0)
  penalty_credits: number;

  @ApiProperty({
    example: 'Las SSD son más rápidas porque no tienen partes móviles y usan memoria flash.',
    description: 'Explicación mostrada al responder correctamente',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  correct_explanation: string;

  @ApiProperty({
    example: 'Respuesta Incorrecta. ¡Inténtalo de nuevo!',
    description: 'Explicación mostrada al responder incorrectamente',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  incorrect_explanation: string;

  @ApiProperty({ enum: QuestionLevel, example: QuestionLevel.MEDIO, description: 'Nivel de dificultad' })
  @IsEnum(QuestionLevel)
  level: QuestionLevel;

  @ApiPropertyOptional({ example: 'https://cdn.tecnopoly.com/img/storage.png', description: 'URL de imagen opcional para la pregunta' })
  @IsOptional()
  @IsUrl()
  image_url?: string;
}
