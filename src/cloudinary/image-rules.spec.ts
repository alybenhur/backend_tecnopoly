import { isInsideFolder, questionsFolder, validateImageResource, MAX_IMAGE_BYTES } from './image-rules';

describe('image-rules', () => {
  const folder = questionsFolder('tecnopoly', 'abc123');

  it('arma la carpeta por asignatura sin barras sobrantes', () => {
    expect(folder).toBe('tecnopoly/questions/abc123');
    expect(questionsFolder('/tecnopoly/', 'x')).toBe('tecnopoly/questions/x');
  });

  it('solo acepta public_id dentro de la carpeta de la asignatura', () => {
    expect(isInsideFolder('tecnopoly/questions/abc123/foto', folder)).toBe(true);
    expect(isInsideFolder('tecnopoly/questions/otra/foto', folder)).toBe(false);
    expect(isInsideFolder('tecnopoly/questions/abc1234/foto', folder)).toBe(false);
    expect(isInsideFolder('tecnopoly/questions/abc123/../otra/foto', folder)).toBe(false);
    expect(isInsideFolder('', folder)).toBe(false);
  });

  const ok = {
    public_id: 'tecnopoly/questions/abc123/foto',
    format: 'png',
    bytes: 1024,
    resource_type: 'image',
    secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/tecnopoly/questions/abc123/foto.png',
  };

  it('acepta una imagen válida', () => {
    expect(validateImageResource(ok, folder)).toBeNull();
  });

  it('rechaza formato, tamaño, tipo y carpeta incorrectos', () => {
    expect(validateImageResource({ ...ok, format: 'gif' }, folder)).toMatch(/Formato/);
    expect(validateImageResource({ ...ok, bytes: MAX_IMAGE_BYTES + 1 }, folder)).toMatch(/5 MB/);
    expect(validateImageResource({ ...ok, resource_type: 'video' }, folder)).toMatch(/no es una imagen/);
    expect(validateImageResource({ ...ok, public_id: 'otra/foto' }, folder)).toMatch(/asignatura/);
  });
});
