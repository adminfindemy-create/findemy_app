import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, sansFor, IconPlus, IconX } from '@findemy/ui';
import { uploadMultipart } from '@/lib/api';

export type MediaItem = { url: string; type: 'photo' | 'video' };

const TILE = 104;

export function MediaPicker({
  value,
  onChange,
  max = 10,
}: {
  value: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  max?: number;
}) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    if (value.length >= max) {
      Alert.alert('Limit reached', `You can add up to ${max} photos or videos.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media library access to add photos and videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'),
        type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      } as any);
      const uploaded = await uploadMultipart<MediaItem>('/studio/media/upload', form);
      onChange([...value, { url: uploaded.url, type: uploaded.type }]);
    } catch (error: any) {
      Alert.alert('Upload failed', error.message || 'Could not upload media');
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => onChange(value.filter((mediaItem) => mediaItem.url !== url));

  return (
    <View>
      <View style={styles.grid}>
        {value.map((mediaItem) => (
          <View key={mediaItem.url} style={[styles.tile, { borderColor: theme.color.hairline, backgroundColor: theme.color.charcoal }]}>
            {mediaItem.type === 'photo' ? (
              <Image source={{ uri: mediaItem.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.videoTile]}>
                <Text style={{ color: '#fff', fontSize: 22 }}>▶</Text>
                <Text style={{ fontFamily: sansFor(700), fontSize: 9.5, letterSpacing: 0.6, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>VIDEO</Text>
              </View>
            )}
            <Pressable onPress={() => remove(mediaItem.url)} style={styles.removeBtn} hitSlop={6}>
              <IconX size={12} color="#fff" />
            </Pressable>
          </View>
        ))}

        {value.length < max ? (
          <Pressable
            onPress={pick}
            disabled={uploading}
            style={[styles.tile, styles.addTile, { borderColor: theme.color.persimmon }]}
          >
            {uploading ? (
              <ActivityIndicator color={theme.color.persimmon} />
            ) : (
              <>
                <IconPlus size={20} color={theme.color.persimmon} />
                <Text style={{ fontFamily: sansFor(700), fontSize: 11, color: theme.color.persimmon, marginTop: 4 }}>Add</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 10 }}>
        {value.length}/{max} · photos & videos · at least 3 required
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoTile: { alignItems: 'center', justifyContent: 'center' },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
