import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button, useTheme, sansFor } from '@findemy/ui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCreateCoach } from '@/hooks/useStudioQueries';
import { AvatarPicker } from '@/components/AvatarPicker';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewCoachScreen() {
  const router = useRouter();
  const theme = useTheme();
  const createCoach = useCreateCoach();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', specialty: '', bio: '', phone: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createCoach.mutateAsync({
        name: data.name,
        specialty: data.specialty,
        bio: data.bio || undefined,
        phone: data.phone || undefined,
        avatar_url: avatarUrl,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create coach');
    }
  };

  const Label = ({ children }: { children: string }) => (
    <Text style={[styles.fgh, { color: theme.color.whisper }]}>{children}</Text>
  );

  return (
    <Screen header={<ScreenHeader title="Add new coach" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
          <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
        </View>

        <Label>Coach name</Label>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState: { error } }) => (
            <Input placeholder="Full name" value={field.value} onChangeText={field.onChange} error={error?.message} />
          )}
        />

        <Label>Specialties</Label>
        <Controller
          control={control}
          name="specialty"
          render={({ field, fieldState: { error } }) => (
            <Input placeholder="e.g. Guitar · Ukulele" value={field.value} onChangeText={field.onChange} error={error?.message} />
          )}
        />

        <Label>Phone number</Label>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input placeholder="98765 43210" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
          )}
        />

        <Label>Bio (optional)</Label>
        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <Input placeholder="A short intro" value={field.value} onChangeText={field.onChange} multiline numberOfLines={3} />
          )}
        />

        <View style={{ height: 24 }} />
        <Button variant="dark" block loading={createCoach.isPending} onPress={handleSubmit(onSubmit)}>
          Register coach
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16 },
  fgh: {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
});
