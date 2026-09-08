import {
  Injectable, NotFoundException,
  ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel }      from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { Subject, SubjectDocument }   from '../schemas/subject.schema';
import { User, UserDocument }         from '../schemas/user.schema';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { CreateSubjectDto }   from './dto/create-subject.dto';
import { UpdateSubjectDto }   from './dto/update-subject.dto';
import { AssignProfessorDto } from './dto/assign-professor.dto';
import { Role }               from '../common/enums/role.enum';

/** Relaciones que acompañan siempre a una asignatura en las respuestas. */
const SUBJECT_POPULATE = ['grade', 'subject_professors.professor'];

/** Colación de MongoDB que compara texto ignorando mayúsculas y acentos. */
const CASE_INSENSITIVE = { locale: 'es', strength: 1 } as const;

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name)  private subjectModel:  Model<SubjectDocument>,
    @InjectModel(User.name)     private userModel:     Model<UserDocument>,
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
  ) {}

  private async verifySubject(id: string) {
    const s = await this.subjectModel.findById(id);
    if (!s) throw new NotFoundException(`Asignatura con id ${id} no encontrada`);
    return s;
  }

  private async verifyProfessor(professorId: string) {
    const u = await this.userModel.findById(professorId);
    if (!u) throw new NotFoundException(`Profesor con id ${professorId} no encontrado`);
    if (u.role !== Role.PROFESOR)
      throw new ForbiddenException(`El usuario ${professorId} no tiene rol de profesor`);
    return u;
  }

  /**
   * El nombre solo tiene que ser único dentro del mismo grado,
   * comparado sin distinguir mayúsculas.
   */
  private async assertNameAvailable(name: string, gradeId?: string | null, exceptId?: string) {
    const filter: QueryFilter<SubjectDocument> = {
      name,
      grade_id: gradeId ?? null,
    };
    if (exceptId) filter._id = { $ne: exceptId };

    const dup = await this.subjectModel
      .findOne(filter)
      .collation(CASE_INSENSITIVE)
      .select('_id');

    if (dup) throw new ConflictException(`Ya existe una asignatura con el nombre "${name}"`);
  }

  async create(dto: CreateSubjectDto, adminId: string) {
    await this.assertNameAvailable(dto.name, dto.grade_id);

    const created = await this.subjectModel.create({ ...dto, created_by: adminId });
    return this.findOne(created.id);
  }

  async findAll() {
    return this.subjectModel
      .find()
      .populate(SUBJECT_POPULATE)
      .sort({ created_at: -1 });
  }

  async findOne(id: string) {
    const s = await this.subjectModel.findById(id).populate(SUBJECT_POPULATE);
    if (!s) throw new NotFoundException(`Asignatura con id ${id} no encontrada`);
    return s;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const subject = await this.verifySubject(id);

    if (dto.name) {
      // Si en el mismo PATCH cambia el grado, el nombre se valida contra el nuevo.
      const gradeId = dto.grade_id ?? subject.grade_id?.toString() ?? null;
      await this.assertNameAvailable(dto.name, gradeId, id);
    }

    await this.subjectModel.updateOne({ _id: id }, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.verifySubject(id);

    // Equivalente al ON DELETE CASCADE de `questions.subject_id`.
    await this.questionModel.deleteMany({ subject_id: id });
    await this.subjectModel.findByIdAndDelete(id);

    return { message: `Asignatura con id ${id} eliminada correctamente` };
  }

  async assignProfessor(subjectId: string, dto: AssignProfessorDto) {
    await this.verifySubject(subjectId);
    await this.verifyProfessor(dto.professor_id);

    const already = await this.subjectModel.exists({
      _id: subjectId,
      'subject_professors.professor_id': dto.professor_id,
    });
    if (already) throw new ConflictException('El profesor ya está asignado a esta asignatura');

    await this.subjectModel.updateOne(
      { _id: subjectId },
      { $push: { subject_professors: { professor_id: dto.professor_id, assigned_at: new Date() } } },
    );

    const professors = await this.getProfessors(subjectId);
    return professors.find(p => p.professor_id.toString() === dto.professor_id);
  }

  async removeProfessor(subjectId: string, professorId: string) {
    const assigned = await this.subjectModel.exists({
      _id: subjectId,
      'subject_professors.professor_id': professorId,
    });
    if (!assigned) throw new NotFoundException('El profesor no está asignado a esta asignatura');

    await this.subjectModel.updateOne(
      { _id: subjectId },
      { $pull: { subject_professors: { professor_id: professorId } } },
    );
    return { message: 'Profesor desasignado correctamente' };
  }

  async getProfessors(subjectId: string) {
    const subject = await this.subjectModel
      .findById(subjectId)
      .populate('subject_professors.professor');

    if (!subject) throw new NotFoundException(`Asignatura con id ${subjectId} no encontrada`);
    return subject.subject_professors;
  }

  async isProfessorAssigned(subjectId: string, professorId: string): Promise<boolean> {
    const assigned = await this.subjectModel.exists({
      _id: subjectId,
      'subject_professors.professor_id': professorId,
    });
    return !!assigned;
  }
}
