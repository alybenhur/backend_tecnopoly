import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import {
  ALLOWED_IMAGE_FORMATS,
  CloudinaryResourceInfo,
  MAX_IMAGE_BYTES,
  questionsFolder,
  isInsideFolder,
  validateImageResource,
} from './image-rules';

/**
 * Imágenes de preguntas en Cloudinary.
 *
 * El navegador sube el archivo directo a Cloudinary con una firma que da el
 * backend (el secreto nunca sale del servidor y la imagen no pasa por el VPS).
 * Al guardar la pregunta se verifica el recurso con la Admin API.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseFolder: string;

  constructor(config: ConfigService) {
    this.cloudName  = config.get<string>('CLOUDINARY_CLOUD_NAME', '');
    this.apiKey     = config.get<string>('CLOUDINARY_API_KEY', '');
    this.apiSecret  = config.get<string>('CLOUDINARY_API_SECRET', '');
    this.baseFolder = config.get<string>('CLOUDINARY_FOLDER', 'tecnopoly');

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  private ensureConfigured() {
    if (!this.cloudName || !this.apiKey || !this.apiSecret)
      throw new ServiceUnavailableException('Cloudinary no está configurado en el servidor');
  }

  folderFor(subjectId: string) {
    return questionsFolder(this.baseFolder, subjectId);
  }

  /**
   * Parámetros firmados para que el panel suba una imagen directo a Cloudinary.
   * La firma fija la carpeta de la asignatura y los formatos permitidos; el
   * tamaño (5 MB) lo revisa el panel antes de subir y el backend al guardar.
   */
  signUpload(subjectId: string) {
    this.ensureConfigured();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = this.folderFor(subjectId);
    const allowed_formats = ALLOWED_IMAGE_FORMATS.join(',');

    const signature = cloudinary.utils.api_sign_request({ timestamp, folder, allowed_formats }, this.apiSecret);

    return {
      upload_url: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      timestamp,
      signature,
      folder,
      allowed_formats,
      max_bytes: MAX_IMAGE_BYTES,
    };
  }

  /**
   * Comprueba que la imagen exista en nuestra cuenta, dentro de la carpeta de la
   * asignatura, con formato y tamaño permitidos. Devuelve su URL segura oficial.
   */
  async verifyQuestionImage(publicId: string, subjectId: string): Promise<string> {
    this.ensureConfigured();
    const folder = this.folderFor(subjectId);
    if (!isInsideFolder(publicId, folder))
      throw new BadRequestException('La imagen no pertenece a esta asignatura');

    let res: CloudinaryResourceInfo;
    try {
      res = (await cloudinary.api.resource(publicId, { resource_type: 'image' })) as CloudinaryResourceInfo;
    } catch {
      throw new BadRequestException('La imagen no existe en Cloudinary; vuelve a subirla');
    }

    const problema = validateImageResource(res, folder);
    if (problema) throw new BadRequestException(problema);
    return res.secure_url;
  }

  /** Borra una imagen de la asignatura. Nunca falla la operación principal. */
  async destroy(publicId: string | null | undefined, subjectId?: string) {
    if (!publicId) return;
    if (subjectId && !isInsideFolder(publicId, this.folderFor(subjectId))) return;
    try {
      this.ensureConfigured();
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    } catch (e) {
      this.logger.warn(`No se pudo borrar la imagen ${publicId}: ${(e as Error).message}`);
    }
  }
}
