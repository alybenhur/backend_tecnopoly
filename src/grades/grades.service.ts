import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(private supabaseService: SupabaseService) {}

  // ── Crear grado ────────────────────────────────────────────────────────
  async create(createGradeDto: CreateGradeDto, adminId: string) {
    const client = this.supabaseService.getClient();

    // Verificar nombre duplicado
    const { data: existing } = await client
      .from('grades')
      .select('id')
      .eq('name', createGradeDto.name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`Ya existe un grado con el nombre "${createGradeDto.name}"`);
    }

    const { data, error } = await client
      .from('grades')
      .insert({
        name:        createGradeDto.name,
        description: createGradeDto.description ?? null,
        created_by:  adminId,
      })
      .select('id, name, description, created_by, created_at')
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // ── Listar todos los grados ────────────────────────────────────────────
  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('grades')
      .select(`
        id,
        name,
        description,
        created_at,
        subjects (
          id,
          name,
          description
        )
      `)
      .order('name', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // ── Obtener grado por ID (con sus asignaturas) ─────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('grades')
      .select(`
        id,
        name,
        description,
        created_at,
        subjects (
          id,
          name,
          description,
          subject_professors (
            professor_id,
            assigned_at,
            users ( id, name, email )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Grado con id "${id}" no encontrado`);
    return data;
  }

  // ── Listar asignaturas de un grado ─────────────────────────────────────
  async findSubjectsByGrade(gradeId: string) {
    // Verificar que el grado existe
    await this.findOne(gradeId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('subjects')
      .select(`
        id,
        name,
        description,
        created_at,
        subject_professors (
          professor_id,
          assigned_at,
          users ( id, name, email )
        )
      `)
      .eq('grade_id', gradeId)
      .order('name', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // ── Actualizar grado ───────────────────────────────────────────────────
  async update(id: string, updateGradeDto: UpdateGradeDto) {
    const client = this.supabaseService.getClient();

    // Verificar que existe
    await this.findOne(id);

    // Verificar nombre duplicado si se va a cambiar
    if (updateGradeDto.name) {
      const { data: existing } = await client
        .from('grades')
        .select('id')
        .eq('name', updateGradeDto.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(`Ya existe un grado con el nombre "${updateGradeDto.name}"`);
      }
    }

    const { data, error } = await client
      .from('grades')
      .update(updateGradeDto)
      .eq('id', id)
      .select('id, name, description, created_at')
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // ── Eliminar grado ─────────────────────────────────────────────────────
  async remove(id: string) {
    const client = this.supabaseService.getClient();

    await this.findOne(id);

    const { error } = await client
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
    return { message: `Grado eliminado correctamente` };
  }
}
