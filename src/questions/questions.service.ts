import {
  Injectable, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel }      from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { CreateQuestionDto, AnswerOptionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionLevel }    from '../common/enums/question-level.enum';
import { QuestionType }     from '../common/enums/question-type.enum';
import { Role }             from '../common/enums/role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    private cloudinary: CloudinaryService,
  ) {}

  /**
   * Campos de imagen según el tipo de pregunta:
   *  - image: exige image_public_id; se verifica en Cloudinary y la URL la pone el backend.
   *  - text: no lleva imagen de Cloudinary (se conserva la URL opcional de siempre).
   */
  private async resolveImage(
    subjectId: string,
    type: QuestionType,
    publicId: string | null | undefined,
    textImageUrl: string | null | undefined,
  ) {
    if (type === QuestionType.IMAGE) {
      if (!publicId) throw new BadRequestException('Una pregunta de imagen necesita su imagen');
      const url = await this.cloudinary.verifyQuestionImage(publicId, subjectId);
      return { question_type: type, image_public_id: publicId, image_url: url };
    }
    return { question_type: QuestionType.TEXT, image_public_id: null, image_url: textImageUrl || null };
  }

  /** Firma para que el panel suba una imagen directo a Cloudinary. */
  signImageUpload(subjectId: string) {
    return this.cloudinary.signUpload(subjectId);
  }

  /** Descarta una imagen subida que no se usó (p. ej. el profesor canceló el formulario). */
  async discardImage(subjectId: string, publicId: string) {
    const inUse = await this.questionModel.exists({ image_public_id: publicId });
    if (inUse) throw new BadRequestException('La imagen la usa una pregunta guardada; no se puede descartar');
    if (!publicId.startsWith(this.cloudinary.folderFor(subjectId) + '/'))
      throw new ForbiddenException('La imagen no pertenece a esta asignatura');
    await this.cloudinary.destroy(publicId, subjectId);
    return { message: 'Imagen descartada' };
  }

  private async verifyQuestion(id: string) {
    const q = await this.questionModel.findById(id);
    if (!q) throw new NotFoundException(`Pregunta con id ${id} no encontrada`);
    return q;
  }

  /**
   * Antes lo garantizaba el UNIQUE(question_id, order_index) de MySQL;
   * con las opciones embebidas hay que comprobarlo aquí.
   */
  private normalizeOptions(options: AnswerOptionDto[]) {
    const indexes = new Set(options.map(o => o.order_index));
    if (indexes.size !== options.length)
      throw new BadRequestException('Hay opciones con el mismo order_index');

    return [...options].sort((a, b) => a.order_index - b.order_index);
  }

  private assertCorrectIndex(correctIndex: number, total: number) {
    if (correctIndex >= total)
      throw new BadRequestException(
        `correct_answer_index (${correctIndex}) excede el número de opciones (${total})`,
      );
  }

  async create(subjectId: string, dto: CreateQuestionDto, professorId: string) {
    const { answer_options, question_type, image_public_id, image_url, ...qData } = dto;

    const options = this.normalizeOptions(answer_options);
    this.assertCorrectIndex(dto.correct_answer_index, options.length);

    const image = await this.resolveImage(subjectId, question_type ?? QuestionType.TEXT, image_public_id, image_url);

    return this.questionModel.create({
      ...qData,
      ...image,
      subject_id:     subjectId,
      created_by:     professorId,
      answer_options: options,
    });
  }

  async findAllBySubject(subjectId: string, level?: QuestionLevel) {
    const filter: QueryFilter<QuestionDocument> = { subject_id: subjectId };
    if (level) filter.level = level;

    return this.questionModel.find(filter).sort({ created_at: -1 });
  }

  async findOne(id: string) {
    return this.verifyQuestion(id);
  }

  async update(id: string, dto: UpdateQuestionDto, user: { id: string; role: string }) {
    const question = await this.verifyQuestion(id);

    if (user.role !== Role.ADMIN && question.created_by?.toString() !== user.id)
      throw new ForbiddenException('Solo puedes editar las preguntas que tú creaste');

    const { answer_options, question_type, image_public_id, image_url, ...qData } = dto;

    const options = answer_options ? this.normalizeOptions(answer_options) : undefined;
    const totalOptions = options?.length ?? question.answer_options.length;
    const correctIndex = dto.correct_answer_index ?? question.correct_answer_index;
    this.assertCorrectIndex(correctIndex, totalOptions);

    // Imagen: solo se recalcula si el cambio la toca (tipo, imagen nueva o URL)
    const subjectId = question.subject_id.toString();
    const tocaImagen = question_type !== undefined || image_public_id !== undefined || image_url !== undefined;
    let image = {};
    if (tocaImagen) {
      const tipo = question_type ?? question.question_type ?? QuestionType.TEXT;
      const publicId = tipo === QuestionType.IMAGE ? (image_public_id ?? question.image_public_id) : null;
      // Al pasar de imagen a texto no se arrastra la URL de Cloudinary
      const textUrl = image_url !== undefined ? image_url
                    : question.question_type === QuestionType.IMAGE ? null : question.image_url;
      image = await this.resolveImage(subjectId, tipo, publicId, textUrl);
    }

    const updated = await this.questionModel.findByIdAndUpdate(
      id,
      // Enviar la lista completa reemplaza las opciones anteriores.
      { ...qData, ...image, ...(options ? { answer_options: options } : {}) },
      { new: true },
    );

    if (!updated) throw new NotFoundException(`Pregunta con id ${id} no encontrada`);

    // La imagen anterior ya no se usa: liberar espacio en Cloudinary
    if (question.image_public_id && question.image_public_id !== updated.image_public_id)
      await this.cloudinary.destroy(question.image_public_id, subjectId);

    return updated;
  }

  async remove(id: string, user: { id: string; role: string }) {
    const question = await this.verifyQuestion(id);

    if (user.role !== Role.ADMIN && question.created_by?.toString() !== user.id)
      throw new ForbiddenException('Solo puedes eliminar las preguntas que tú creaste');

    await this.questionModel.findByIdAndDelete(id);
    await this.cloudinary.destroy(question.image_public_id, question.subject_id.toString());
    return { message: `Pregunta con id ${id} eliminada correctamente` };
  }
}
