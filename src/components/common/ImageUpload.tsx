import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Upload } from 'lucide-react-native';
import { Button } from './Button';
import { pickImage } from '../../services/ImageService';
import { useToast } from '../../state/ToastProvider';
import { colors, shared } from '../../theme';
export function ImageUpload({ label, value, onChange, error }: { label: string; value: string | null; onChange: (value: string | null) => void; error?: string }) {
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  const upload = async () => {
    setBusy(true);
    try { const uri = await pickImage(); if (uri) onChange(uri); }
    catch (error) { notify(error instanceof Error ? error.message : 'Image could not be opened.', 'error'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 10 }}>
    <Text style={shared.label}>{label}</Text>
    {value && <Image accessibilityLabel={label} source={{ uri: value }} resizeMode="contain" style={{ width: 110, height: 90, backgroundColor: 'white', borderRadius: 8 }} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button title={`Choose ${label.toLowerCase()}`} busy={busy} onPress={() => { void upload(); }} icon={<Upload size={16} color={colors.text} />} />
      {value && <Button title={`Remove ${label.toLowerCase()}`} variant="ghost" onPress={() => onChange(null)} />}
    </View>
    <Text style={[shared.subtitle, { fontSize: 11 }]}>{error || 'PNG, JPG or WebP · Up to 3 MB'}</Text>
  </View>;
}
