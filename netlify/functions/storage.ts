import { getSupabaseConfig } from './supabase';

type UploadResult = { url: string };

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const data = match[2];
  return { mime, data };
};

const mimeToExtension = (mime: string) => {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
};

export const uploadEventImage = async (dataUrl: string, objectKey: string) => {
  return uploadDataUrlImage(dataUrl, objectKey, process.env.SUPABASE_STORAGE_BUCKET || 'event-images');
};

export const uploadDataUrlImage = async (
  dataUrl: string,
  objectKey: string,
  bucket: string
) => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const { url, serviceKey } = getSupabaseConfig();
  const ext = mimeToExtension(parsed.mime);
  const objectPath = `${objectKey}.${ext}`;
  const buffer = Buffer.from(parsed.data, 'base64');
  const uploadUrl = `${url}/storage/v1/object/${bucket}/${objectPath}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': parsed.mime,
      'x-upsert': 'true'
    },
    body: buffer
  });
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`Supabase storage upload failed: ${uploadResponse.status} ${text}`);
  }
  return {
    url: `${url}/storage/v1/object/public/${bucket}/${objectPath}`
  } as UploadResult;
};
