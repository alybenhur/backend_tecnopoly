import {
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectModel }   from '@nestjs/mongoose';
import { Model }         from 'mongoose';
import * as bcrypt       from 'bcrypt';
import { User, UserDocument }         from '../schemas/user.schema';
import { Grade, GradeDocument }       from '../schemas/grade.schema';
import { Subject, SubjectDocument }   from '../schemas/subject.schema';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { CreateUserDto }    from './dto/create-user.dto';
import { UpdateUserDto }    from './dto/update-user.dto';
import { Role }             from '../common/enums/role.enum';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)     private userModel:     Model<UserDocument>,
    @InjectModel(Grade.name)    private gradeModel:    Model<GradeDocument>,
    @InjectModel(Subject.name)  private subjectModel:  Model<SubjectDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
  ) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.exists({ email });
    if (existing) throw new ConflictException(`El email ${dto.email} ya está registrado`);

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.userModel.create({
      name: dto.name,
      email,
      password_hash,
      role: dto.role,
    });
  }

  async findAll(role?: Role) {
    return this.userModel
      .find(role ? { role } : {})
      .sort({ created_at: -1 });
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const updateData: Record<string, unknown> = {};

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const existing = await this.userModel.findOne({ email });
      if (existing && existing.id !== id)
        throw new ConflictException(`El email ${dto.email} ya está en uso`);
      updateData.email = email;
    }

    if (dto.name)     updateData.name = dto.name;
    if (dto.role)     updateData.role = dto.role;
    if (dto.password) updateData.password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const updated = await this.userModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // MongoDB no tiene claves foráneas: se replican a mano las acciones
    // ON DELETE que antes aplicaba MySQL.
    await Promise.all([
      // CASCADE: desasigna al profesor de todas sus asignaturas.
      this.subjectModel.updateMany(
        { 'subject_professors.professor_id': id },
        { $pull: { subject_professors: { professor_id: id } } },
      ),
      // SET NULL: el contenido creado sobrevive al usuario.
      this.subjectModel.updateMany({ created_by: id },  { $set: { created_by: null } }),
      this.gradeModel.updateMany({ created_by: id },    { $set: { created_by: null } }),
      this.questionModel.updateMany({ created_by: id }, { $set: { created_by: null } }),
    ]);

    await this.userModel.findByIdAndDelete(id);
    return { message: `Usuario con id ${id} eliminado correctamente` };
  }
}
