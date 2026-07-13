import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Image, ActivityIndicator } from 'react-native';
import { useTheme, sansFor, Button, Input, Chip, BlockPrintCover, IconShield } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useStudioAcademy } from '@/hooks/useStudioAcademy';
import { api, uploadMultipart, deleteJson } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

const schema = z.object({
  name: z.string().min(1, 'Academy name is required'),
  tagline: z.string().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').or(z.literal('')).optional(),
  holder_name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const MIN_IMAGES = 4;
const MAX_IMAGES = 10;

export default function ProfileEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const { data, isLoading, refetch } = useStudioAcademy();
  const academy = (data as any)?.academy;
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [newSpec, setNewSpec] = useState('');
  const verified = academy?.verified ?? false;

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', tagline: '', bio: '', address: '', account_number: '', ifsc: '', holder_name: '' },
  });

  useEffect(() => {
    if (academy) {
      reset({
        name: academy.name ?? '',
        tagline: academy.tagline ?? '',
        bio: academy.bio ?? '',
        address: academy.address ?? '',
        account_number: academy.bank_account_number ?? '',
        ifsc: academy.bank_ifsc ?? '',
        holder_name: academy.bank_holder_name ?? '',
      });
      setImages(academy.images ?? []);
      setSpecialities(academy.specialities ?? []);
    }
  }, [academy, reset]);

  const addSpec = () => {
    const trimmed = newSpec.trim();
    if (!trimmed || specialities.includes(trimmed)) return;
    setSpecialities((prev) => [...prev, trimmed]);
    setNewSpec('');
  };
  const removeSpec = (spec: string) => setSpecialities((prev) => prev.filter((existingSpec) => existingSpec !== spec));

  const onSubmit = async (values: FormData) => {
    try {
      await api.studio.academy.update({
        name: values.name,
        tagline: values.tagline || undefined,
        bio: values.bio,
        address: values.address || undefined,
        specialities,
        bank_account_number: values.account_number || undefined,
        bank_ifsc: values.ifsc || undefined,
        bank_holder_name: values.holder_name || undefined,
      });
      showToast('Profile saved', 'success');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    }
  };

  const pickAndUpload = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in Settings to add academy photos.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      // S1.1: gallery accepts photos AND videos (backend ≤10 total, image/video MIME).
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as any);

      const uploaded = await uploadMultipart<{ url: string; images: string[] }>(
        '/studio/academy/upload',
        formData
      );
      setImages(uploaded.images);
      showToast('Image uploaded', 'success');
      refetch();
    } catch (error: any) {
      Alert.alert('Upload failed', error.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    Alert.alert('Remove image', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await deleteJson<{ images: string[] }>(
              '/studio/academy/image',
              { url }
            );
            setImages(updated.images);
            refetch();
          } catch {
            Alert.alert('Error', 'Could not remove image');
          }
        },
      },
    ]);
  };

  const remaining = MIN_IMAGES - images.length;

  const cover = images[0];
  const category = (academy?.category ?? 'music') as 'music' | 'dance' | 'arts' | 'yoga';

  return (
    <Screen header={<ScreenHeader title="Academy profile" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {/* Cover preview */}
        <View style={styles.cover}>
          {cover ? (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
          ) : (
            <BlockPrintCover category={category} variant={2} height={140} hideLetter style={StyleSheet.absoluteFill as any} />
          )}
          {verified ? (
            <View style={[styles.coverBadge, { backgroundColor: theme.color.jade }]}>
              <IconShield size={12} color="#fff" />
              <Text style={{ fontFamily: sansFor(700), fontSize: 10, letterSpacing: 0.4, color: '#fff' }}>Verified</Text>
            </View>
          ) : null}
          <Pressable
            style={styles.changeCover}
            onPress={pickAndUpload}
            disabled={uploading}
          >
            <Text style={{ fontFamily: sansFor(700), fontSize: 12, color: '#fff' }}>
              {uploading ? 'Uploading…' : 'Change cover'}
            </Text>
          </Pressable>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState: { error } }) => (
            <Input label="Academy name" value={field.value} onChangeText={field.onChange} placeholder="e.g. The Rhythm House" error={error?.message} />
          )}
        />
        <View style={{ height: 14 }} />
        <Controller
          control={control}
          name="tagline"
          render={({ field }) => (
            <Input label="Tagline" value={field.value ?? ''} onChangeText={field.onChange} placeholder="A warm, gear-rich space for guitar, keys & vocals." />
          )}
        />
        <View style={{ height: 14 }} />
        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <Input label="About" value={field.value} onChangeText={field.onChange} placeholder="Group and 1-on-1 batches for all ages. Beginners welcome." multiline />
          )}
        />
        <View style={{ height: 14 }} />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input label="Address" value={field.value ?? ''} onChangeText={field.onChange} placeholder="Hauz Khas, New Delhi" />
          )}
        />

        {/* Specialities */}
        <Text style={[styles.sectionLabel, { color: theme.color.whisper }]}>SPECIALITIES</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {specialities.map((spec) => (
            <Chip key={spec} label={`${spec}  ✕`} selected onPress={() => removeSpec(spec)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input value={newSpec} onChangeText={setNewSpec} placeholder="Add a speciality" />
          </View>
          <Button size="sm" variant="soft" onPress={addSpec}>Add</Button>
        </View>

        {/* Offered modes (read-only; set during onboarding — S0.3/S1.1) */}
        {academy?.modes_offered?.length ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.color.whisper }]}>MODES OFFERED</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {academy.modes_offered.map((mode: string) => (
                <View key={mode} style={{ backgroundColor: theme.color.paperWarm, borderWidth: 1, borderColor: theme.color.hairline, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.ink }}>
                    {({ in_studio: 'In-studio', online: 'Online', home_visit: 'Home visit' } as Record<string, string>)[mode] ?? mode}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Media grid */}
        <Text style={[styles.sectionLabel, { color: theme.color.whisper, marginBottom: 4 }]}>PHOTOS &amp; VIDEOS</Text>
        {remaining > 0 && (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.rose, marginBottom: 10 }}>
            Add at least {remaining} more photo{remaining !== 1 ? 's' : ''} (minimum {MIN_IMAGES} required)
          </Text>
        )}
        <View style={styles.imageGrid}>
          {images.map((url) => (
            <Pressable key={url} onLongPress={() => removeImage(url)} style={styles.imageTile}>
              <Image
                source={{ uri: url }}
                style={styles.imageTile}
                accessible
                accessibilityLabel="Academy photo"
              />
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeImage(url)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Text style={{ color: theme.color.ivory, fontSize: 12, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </Pressable>
          ))}
          {images.length < MAX_IMAGES && (
            <Pressable
              style={[styles.addTile, { borderColor: theme.color.hairline, backgroundColor: theme.color.ivory }]}
              onPress={pickAndUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={theme.color.mist} />
              ) : (
                <Text style={{ fontSize: 26, color: theme.color.mist }}>+</Text>
              )}
            </Pressable>
          )}
        </View>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.mist, marginTop: 4 }}>
          {images.length}/{MAX_IMAGES} photos · Long-press a photo to remove
        </Text>

        <Text style={[styles.sectionLabel, { color: theme.color.whisper }]}>BANK DETAILS</Text>
        <Controller
          control={control}
          name="account_number"
          render={({ field }) => (
            <Input label="Account number" value={field.value} onChangeText={field.onChange} placeholder="Account number" keyboardType="number-pad" />
          )}
        />
        <View style={{ height: 14 }} />
        <Controller
          control={control}
          name="ifsc"
          render={({ field, fieldState: { error } }) => (
            <Input
              label="IFSC code"
              value={field.value}
              onChangeText={(text) => field.onChange(text.toUpperCase())}
              placeholder="IFSC code"
              error={error?.message}
            />
          )}
        />
        <View style={{ height: 14 }} />
        <Controller
          control={control}
          name="holder_name"
          render={({ field }) => (
            <Input label="Account holder name" value={field.value} onChangeText={field.onChange} placeholder="Account holder name" />
          )}
        />

        <View style={{ height: 24 }} />
        <Button variant="dark" onPress={handleSubmit(onSubmit)} block loading={isSubmitting}>
          Save changes
        </Button>
      </View>
    </Screen>
  );
}

const TILE_SIZE = 96;

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  cover: {
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
    position: 'relative',
  },
  coverBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  changeCover: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
  },
  addTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
