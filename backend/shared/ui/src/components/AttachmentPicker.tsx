import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../ThemeProvider';
import { IconPlus, IconX } from '../icons';

// M2.2: a file/image attachment picker — wraps `expo-image-picker` (already a
// student-app dependency) with a consistent UI, since nothing in @findemy/ui
// covers *picking*/*uploading* media today (only `expo-image` for display).
//
// Deliberately does NOT know how to actually upload a file: the network call
// is injected via `onUpload` so this component stays decoupled from any one
// app's api-client instance / auth machinery (mirrors how academy-app's
// MediaPicker calls a local `uploadMultipart` helper, but generalised as a
// prop instead of a hard import).

export type AttachmentType = 'photo' | 'video';

export type Attachment = {
  url: string;
  type: AttachmentType;
  name?: string;
};

export type PickedAsset = {
  uri: string;
  name: string;
  mimeType: string;
};

export function AttachmentPicker({
  value,
  onChange,
  onUpload,
  disabled = false,
  label = 'Add attachment',
}: {
  /** The single current attachment, or null/undefined if none is set. */
  value?: Attachment | null;
  onChange: (next: Attachment | null) => void;
  /** Performs the actual multipart upload; return the stored file's Attachment. */
  onUpload: (asset: PickedAsset) => Promise<Attachment>;
  disabled?: boolean;
  /** Label on the empty-state add tile. */
  label?: string;
}) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    if (disabled || uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media library access to attach a photo or video.');
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
      const uploaded = await onUpload({
        uri: asset.uri,
        name: asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'),
        mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      });
      onChange(uploaded);
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Could not upload the attachment.');
    } finally {
      setUploading(false);
    }
  };

  const remove = () => onChange(null);

  if (value) {
    return (
      <View style={[styles.tile, { borderColor: theme.color.hairline, backgroundColor: theme.color.paperWarm }]}>
        {value.type === 'photo' ? (
          <Image source={{ uri: value.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.videoTile]}>
            <Text style={{ color: '#fff', fontSize: 22 }}>▶</Text>
            <Text
              style={{
                fontFamily: theme.font.sansBold,
                fontSize: 9.5,
                letterSpacing: 0.6,
                color: 'rgba(255,255,255,0.85)',
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {value.name ?? 'VIDEO'}
            </Text>
          </View>
        )}
        {!disabled ? (
          <Pressable onPress={remove} style={styles.removeBtn} hitSlop={6} accessibilityLabel="Remove attachment">
            <IconX size={12} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <Pressable
      onPress={pick}
      disabled={disabled || uploading}
      style={[
        styles.tile,
        styles.addTile,
        { borderColor: theme.color.persimmon, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {uploading ? (
        <ActivityIndicator color={theme.color.persimmon} />
      ) : (
        <>
          <IconPlus size={20} color={theme.color.persimmon} />
          <Text
            style={{
              fontFamily: theme.font.sansBold,
              fontSize: 11,
              color: theme.color.persimmon,
              marginTop: 4,
              textAlign: 'center',
              paddingHorizontal: 6,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const TILE = 104;

const styles = StyleSheet.create({
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
