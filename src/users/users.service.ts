import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private supabaseService: SupabaseService) {}

  // ─── Crear usuario (solo admin) ───────────────────────────────────────────
  async create(createUserDto: CreateUserDto) {
    const client = this.supabaseService.getClient();
    const { name, email, password, role } = createUserDto;

    // Verificar que el email no esté registrado
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(`El email ${email} ya está registrado`);
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: newUser, error } = await client
      .from('users')
      .insert({ name, email, password_hash, role })
      .select('id, name, email, role, created_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return newUser;
  }

  // ─── Listar todos los usuarios ────────────────────────────────────────────
  async findAll(role?: Role) {
    const client = this.supabaseService.getClient();

    let query = client
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  // ─── Buscar usuario por ID ────────────────────────────────────────────────
  async findOne(id: string) {
    const client = this.supabaseService.getClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return user;
  }

  // ─── Actualizar usuario ────────────────────────────────────────────────────
  async update(id: string, updateUserDto: UpdateUserDto) {
    const client = this.supabaseService.getClient();

    // Verificar que el usuario existe
    await this.findOne(id);

    const updateData: Record<string, unknown> = { ...updateUserDto };

    // Si se manda nueva contraseña, hashearla
    if (updateUserDto.password) {
      updateData.password_hash = await bcrypt.hash(
        updateUserDto.password,
        SALT_ROUNDS,
      );
      delete updateData.password;
    }

    // Si se actualiza el email, verificar que no exista
    if (updateUserDto.email) {
      const { data: existing } = await client
        .from('users')
        .select('id')
        .eq('email', updateUserDto.email)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(
          `El email ${updateUserDto.email} ya está en uso`,
        );
      }
    }

    const { data: updated, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, created_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return updated;
  }

  // ─── Eliminar usuario ──────────────────────────────────────────────────────
  async remove(id: string) {
    const client = this.supabaseService.getClient();

    // Verificar que el usuario existe
    await this.findOne(id);

    const { error } = await client.from('users').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: `Usuario con id ${id} eliminado correctamente` };
  }
}
