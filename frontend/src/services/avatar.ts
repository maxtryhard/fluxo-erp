import { getSupabase } from './supabase';

const bucket = 'profile-avatars';
const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

/** Decode and re-encode locally so uploaded avatars are small, static JPEGs. */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!allowedTypes.includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (!file.size || file.size > maxFileSize) throw new Error('A imagem deve ter no máximo 5 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível ler essa imagem. Escolha outro arquivo.');
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto neste navegador.');
    const side = Math.min(bitmap.width, bitmap.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 384, 384);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 384, 384);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto.')), 'image/jpeg', .85);
    });
  } finally {
    bitmap.close();
  }
}

export async function getAvatarUrl(userId: string): Promise<string | undefined> {
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(`${userId}/avatar.jpg`, 60 * 60 * 24);
  // No uploaded avatar yet: the account continues to use its initial.
  return error ? undefined : data.signedUrl;
}

export async function uploadAvatar(file: File): Promise<string> {
  const image = await prepareAvatar(file);
  const client = getSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error('Entre novamente para alterar sua foto.');
  const { error } = await client.storage.from(bucket).upload(`${auth.user.id}/avatar.jpg`, image, {
    contentType: 'image/jpeg', upsert: true, cacheControl: '0',
  });
  if (error) throw new Error(error.message === 'Bucket not found'
    ? 'O armazenamento de fotos ainda precisa ser configurado no Supabase.'
    : 'Não foi possível salvar sua foto. Tente novamente.');
  const url = await getAvatarUrl(auth.user.id);
  if (!url) throw new Error('A foto foi enviada, mas não foi possível carregá-la. Tente novamente.');
  return url;
}
