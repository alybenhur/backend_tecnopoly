import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignProfessorDto {
  @ApiProperty({ example: '6650f1c2a4b3d2e1a0123456', description: 'ObjectId del profesor a asignar' })
  @IsMongoId()
  professor_id: string;
}
