import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { imageDataSchema } from '../schemas/invoiceSchema';

export async function pickImage(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp'], copyToCacheDirectory: true, base64: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if ((asset.size ?? 0) > 3 * 1024 * 1024) throw new Error('Choose an image smaller than 3 MB.');
  let uri: string;
  if (Platform.OS === 'web') {
    uri = asset.base64 ?? asset.uri;
    if (!uri.startsWith('data:') && asset.file) {
      uri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('This image could not be read.'));
        reader.readAsDataURL(asset.file!);
      });
    }
  } else {
    const mime = asset.mimeType || (asset.name.toLowerCase().endsWith('.png') ? 'image/png' : asset.name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    uri = `data:${mime};base64,${await new File(asset.uri).base64()}`;
  }
  const valid = imageDataSchema.safeParse(uri);
  if (!valid.success || !valid.data) throw new Error('Choose a PNG, JPG, or WebP image smaller than 3 MB.');
  return valid.data;
}
