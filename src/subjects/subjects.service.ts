import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignProfessorDto } from './dto/assign-professor.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SubjectsService {
  constructor(private supabaseService: SupabaseService) {}

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async verifySubjectExists(id: string) {
    const { data: subject, error } = await this.supabaseService
      .getClient()
      .from('subjects')
      .select('id, name, description, created_by, created_at')
      .eq('id', id)
      .single();

    if (error || !subject) {
      throw new NotFoundException(`Asignatura con id ${id} no encontrada`);
    }

    return subject;
  }

  private async verifyProfessorExists(professorId: string) {
    const { data: professor, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('id, name, email, role')
      .eq('id', professorId)
      .single();

    if (error || !professor) {
      throw new NotFoundException(
        `Profesor con id ${professorId} no encontrado`,
      );
    }

    if (professor.role !== Role.PROFESOR) {
      throw new ForbiddenException(
        `El usuario con id ${professorId} no tiene el rol de profesor`,
      );
    }

    return professor;
  }

  // ─── CRUD de asignaturas ──────────────────────────────────────────────────

  async create(createSubjectDto: CreateSubjectDto, adminId: string) {
    const client = this.supabaseService.getClient();
    const { name, description } = createSubjectDto;

    // Verificar nombre duplicado
    const { data: existing } = await client
      .from('subjects')
      .select('id')
      .ilike('name', name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(
        `Ya existe una asignatura con el nombre "${name}"`,
      );
    }

    const { data: newSubject, error } = await client
      .from('subjects')
      .insert({ name, description, created_by: adminId })
      .select('id, name, description, created_by, created_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return newSubject;
  }

  async findAll() {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('subjects')
      .select(
        `
        id,
        name,
        description,
        created_at,
        created_by,
        subject_professors (
          professor_id,
          assigned_at,
          users:professor_id ( id, name, email )
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('subjects')
      .select(
        `
        id,
        name,
        description,
        created_at,
        created_by,
        subject_professors (
          professor_id,
          assigned_at,
          users:professor_id ( id, name, email )
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Asignatura con id ${id} no encontrada`);
    }

    return data;
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    const client = this.supabaseService.getClient();

    // Verificar que la asignatura existe
    await this.verifySubjectExists(id);

    // Verificar nombre duplicado si se manda nuevo nombre
    if (updateSubjectDto.name) {
      const { data: existing } = await client
        .from('subjects')
        .select('id')
        .ilike('name', updateSubjectDto.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(
          `Ya existe una asignatura con el nombre "${updateSubjectDto.name}"`,
        );
      }
    }

    const { data: updated, error } = await client
      .from('subjects')
      .update(updateSubjectDto)
      .eq('id', id)
      .select('id, name, description, created_by, created_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return updated;
  }

  async remove(id: string) {
    const client = this.supabaseService.getClient();

    // Verificar que la asignatura existe
    await this.verifySubjectExists(id);

    const { error } = await client.from('subjects').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: `Asignatura con id ${id} eliminada correctamente` };
  }

  // ─── Gestión de asignaciones de profesores ────────────────────────────────

  async assignProfessor(subjectId: string, dto: AssignProfessorDto) {
    const client = this.supabaseService.getClient();

    // Verificar que existen asignatura y profesor
    await this.verifySubjectExists(subjectId);
    await this.verifyProfessorExists(dto.professor_id);

    // Verificar que no esté ya asignado
    const { data: alreadyAssigned } = await client
      .from('subject_professors')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('professor_id', dto.professor_id)
      .maybeSingle();

    if (alreadyAssigned) {
      throw new ConflictException(
        `El profesor ya está asignado a esta asignatura`,
      );
    }

    const { data, error } = await client
      .from('subject_professors')
      .insert({ subject_id: subjectId, professor_id: dto.professor_id })
      .select(
        `
        id,
        assigned_at,
        users:professor_id ( id, name, email )
      `,
      )
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async removeProfessor(subjectId: string, professorId: string) {
    const client = this.supabaseService.getClient();

    // Verificar que la asignación existe
    const { data: assignment } = await client
      .from('subject_professors')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('professor_id', professorId)
      .maybeSingle();

    if (!assignment) {
      throw new NotFoundException(
        `El profesor no está asignado a esta asignatura`,
      );
    }

    const { error } = await client
      .from('subject_professors')
      .delete()
      .eq('subject_id', subjectId)
      .eq('professor_id', professorId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: `Profesor desasignado de la asignatura correctamente` };
  }

  async getProfessors(subjectId: string) {
    await this.verifySubjectExists(subjectId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('subject_professors')
      .select(
        `
        assigned_at,
        users:professor_id ( id, name, email )
      `,
      )
      .eq('subject_id', subjectId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  // ─── Verificación de asignación (usada en Fase 5) ─────────────────────────

  async isProfessorAssigned(
    subjectId: string,
    professorId: string,
  ): Promise<boolean> {
    const { data } = await this.supabaseService
      .getClient()
      .from('subject_professors')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('professor_id', professorId)
      .maybeSingle();

    return !!data;
  }
}
