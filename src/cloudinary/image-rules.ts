/**
 * Reglas de las imágenes de preguntas. Funciones puras (sin llamar a Cloudinary)
 * para poder probarlas.
 */

/** Tamaño máximo de una imagen de pregunta: 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Formatos aceptados al subir (el juego recibe siempre JPG convertido por Cloudinary). */
export const ALLOWED_IMAGE_FORMATS = ['jpg', 'png', 'webp'] as const;

/** Carpeta de Cloudinary donde viven las imágenes de una asignatura. */
export function questionsFolder(baseFolder: string, subjectId: string): string {
  const base = (baseFolder || 'tecnopoly').replace(/^\/+|\/+$/g, '');
  return `${base}/questions/${subjectId}`;
}

/** True si el public_id está dentro de la carpeta (no en otra asignatura ni fuera de la app). */
export function isInsideFolder(publicId: string, folder: string): boolean {
  if (!publicId || publicId.includes('..')) return false;
  return publicId.startsWith(folder + '/');
}

/** Datos del recurso que devuelve la Admin API de Cloudinary (solo lo que se revisa). */
export interface CloudinaryResourceInfo {
  public_id: string;
  format: string;
  bytes: number;
  resource_type: string;
  secure_url: string;
}

/**
 * Revisa que el recurso subido sea una imagen válida para la asignatura.
 * Devuelve el motivo del rechazo, o null si está bien.
 */
export function validateImageResource(res: CloudinaryResourceInfo, folder: string): string | null {
  if (res.resource_type !== 'image') return 'El archivo no es una imagen';
  if (!isInsideFolder(res.public_id, folder)) return 'La imagen no pertenece a esta asignatura';
  if (!ALLOWED_IMAGE_FORMATS.includes(res.format as (typeof ALLOWED_IMAGE_FORMATS)[number]))
    return `Formato no permitido (${res.format}). Usa JPG, PNG o WEBP`;
  if (res.bytes > MAX_IMAGE_BYTES) return 'La imagen supera el máximo de 5 MB';
  return null;
}
