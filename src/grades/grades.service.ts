import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectModel }      from '@nestjs/mongoose';
import { Model }            from 'mongoose';
import { Grade, GradeDocument }     from '../schemas/grade.schema';
import { Subject, SubjectDocument } from '../schemas/subject.schema';
import { CreateGradeDto }   from './dto/create-grade.dto';
import { UpdateGradeDto }   from './dto/update-grade.dto';

/** Trae el objeto completo del profesor dentro de cada asignatura. */
const PROFESSORS_POPULATE = { path: 'subject_professors.professor' };

@Injectable()
export class GradesService {
  constructor(
    @InjectModel(Grade.name)   private gradeModel:   Model<GradeDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) {}

  async create(dto: CreateGradeDto, adminId: string) {
    const existing = await this.gradeModel.exists({ name: dto.name });
    if (existing) throw new ConflictException(`Ya existe un grado con el nombre "${dto.name}"`);

    return this.gradeModel.create({ ...dto, created_by: adminId });
  }

  async findAll() {
    return this.gradeModel
      .find()
      .populate('subjects')
      .sort({ name: 1 });
  }

  async findOne(id: string) {
    const grade = await this.gradeModel
      .findById(id)
      .populate({ path: 'subjects', populate: PROFESSORS_POPULATE });

    if (!grade) throw new NotFoundException(`Grado con id "${id}" no encontrado`);
    return grade;
  }

  async findSubjectsByGrade(gradeId: string) {
    await this.assertExists(gradeId);
    return this.subjectModel
      .find({ grade_id: gradeId })
      .populate(PROFESSORS_POPULATE)
      .sort({ name: 1 });
  }

  async update(id: string, dto: UpdateGradeDto) {
    await this.assertExists(id);

    if (dto.name) {
      const dup = await this.gradeModel.findOne({ name: dto.name });
      if (dup && dup.id !== id)
        throw new ConflictException(`Ya existe un grado con el nombre "${dto.name}"`);
    }

    return this.gradeModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string) {
    await this.assertExists(id);

    // Equivalente al ON DELETE SET NULL de `subjects.grade_id`.
    await this.subjectModel.updateMany({ grade_id: id }, { $set: { grade_id: null } });
    await this.gradeModel.findByIdAndDelete(id);

    return { message: 'Grado eliminado correctamente' };
  }

  /** Lanza 404 si la asignatura no existe o no pertenece al grado indicado. */
  async assertSubjectBelongs(gradeId: string, subjectId: string) {
    await this.assertExists(gradeId);
    const belongs = await this.subjectModel.exists({ _id: subjectId, grade_id: gradeId });
    if (!belongs)
      throw new NotFoundException(
        `La asignatura con id "${subjectId}" no pertenece al grado "${gradeId}"`,
      );
  }

  private async assertExists(id: string) {
    const exists = await this.gradeModel.exists({ _id: id });
    if (!exists) throw new NotFoundException(`Grado con id "${id}" no encontrado`);
  }
}
