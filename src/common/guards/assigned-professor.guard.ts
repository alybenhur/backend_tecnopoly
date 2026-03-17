import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { SubjectsService } from '../../subjects/subjects.service';
import { Role } from '../enums/role.enum';

/**
 * Guard que verifica que el profesor autenticado esté asignado
 * a la asignatura indicada en el param :subjectId.
 * Los admin pueden pasar libremente.
 */
@Injectable()
export class AssignedProfessorGuard implements CanActivate {
  constructor(
    @Inject(SubjectsService)
    private subjectsService: SubjectsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const subjectId: string = request.params.subjectId;

    // Los admin siempre tienen acceso
    if (user?.role === Role.ADMIN) {
      return true;
    }

    // El profesor debe estar asignado a la asignatura
    const isAssigned = await this.subjectsService.isProfessorAssigned(
      subjectId,
      user.id,
    );

    if (!isAssigned) {
      throw new ForbiddenException(
        'No tienes asignada esta asignatura para poder crear preguntas',
      );
    }

    return true;
  }
}
