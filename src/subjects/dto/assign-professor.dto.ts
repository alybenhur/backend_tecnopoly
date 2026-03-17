import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignProfessorDto {
  @ApiProperty({ example: 'b3d2e1a0-1234-5678-abcd-ef0123456789', description: 'UUID del profesor a asignar' })
  @IsUUID()
  professor_id: string;
}
