import { uploadMultipart } from '@/lib/api';
import { IconCamera, IconX, sansFor, useTheme } from '@findemy/ui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// Single circular photo picker (coach avatar). Uploads to /studio/media/upload → returns a URL.
export function AvatarPicker({
  value,
  onChange,
  size = 96,
  fallbackLetter,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  size?: number;
  fallbackLetter?: string;
}) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a coach photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'coach.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as any);
      const uploaded = await uploadMultipart<{ url: string; type: string }>(
        '/studio/media/upload',
        form
      );
      onChange(uploaded.url);
    } catch (error: any) {
      Alert.alert('Upload failed', error.message || 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={pick} disabled={uploading} style={{ width: size, height: size }}>
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.color.paperWarm,
              borderColor: theme.color.hairline,
            },
          ]}
        >
          {value ? (
            <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Text
              style={{
                fontFamily: theme.font.serif,
                fontSize: size * 0.36,
                color: theme.color.whisper,
              }}
            >
              {fallbackLetter?.toUpperCase() || '+'}
            </Text>
          )}
          {uploading ? (
            <View style={[StyleSheet.absoluteFill, styles.uploading]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </View>
        {/* Camera badge — sibling so the circular clip doesn't cut it off */}
        <View
          style={[
            styles.camBadge,
            { backgroundColor: theme.color.persimmon, borderColor: theme.color.paper },
          ]}
          pointerEvents="none"
        >
          <IconCamera size={14} color="#fff" />
        </View>
      </Pressable>

      {value ? (
        <Pressable
          onPress={() => onChange(null)}
          hitSlop={8}
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <IconX size={12} color={theme.color.mist} />
          <Text style={{ fontFamily: sansFor(600), fontSize: 12, color: theme.color.mist }}>
            Remove photo
          </Text>
        </Pressable>
      ) : (
        <Text
          style={{
            fontFamily: sansFor(600),
            fontSize: 12,
            color: theme.color.persimmon,
            marginTop: 8,
          }}
        >
          Add photo
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  uploading: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
