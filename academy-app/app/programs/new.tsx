import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, Input, Button, Chip, sansFor } from '@findemy/ui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { useCreateProgram } from '@/hooks/useStudioQueries';
import { MediaPicker, type MediaItem } from '@/components/MediaPicker';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'A short description is required'),
  things_to_know: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = ['music', 'dance', 'arts', 'yoga'];

export default function NewProgramScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { show: showToast } = useToast();
  const [category, setCategory] = useState('music');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const createProgram = useCreateProgram();

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', things_to_know: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (media.length < 3) {
      Alert.alert('Add media', 'Please add at least 3 photos or videos for this program.');
      return;
    }
    try {
      const things = (data.things_to_know ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const response = await createProgram.mutateAsync({
        title: data.title,
        category,
        description: data.description,
        things_to_know: things.length ? things : undefined,
        media,
      });
      showToast('Program created', 'success');
      const id = (response as any)?.program?.id;
      // Land on the new (empty) program so the academy can add its first batch.
      if (id) router.replace(`/programs/${id}` as never);
      else router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create program');
    }
  };

  const fgh = {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: theme.color.whisper,
  };

  return (
    <Screen header={<ScreenHeader title="New program" showBack />} bottomTab={null} scroll>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Text style={[fgh, { marginBottom: 4 }]}>Photos & videos</Text>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginBottom: 12 }}>
          Add at least 3 (up to 10). These show at the top of your program.
        </Text>
        <View style={{ marginBottom: 20 }}>
          <MediaPicker value={media} onChange={setMedia} max={10} />
        </View>

        <Text style={[fgh, { marginBottom: 10 }]}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((categoryOption) => (
            <Chip key={categoryOption} label={categoryOption} selected={category === categoryOption} onPress={() => setCategory(categoryOption)} />
          ))}
        </View>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="Program name (e.g. Guitar Lessons)" value={value} onChangeText={onChange} error={error?.message} />
          )}
        />

        <Text style={[fgh, { marginTop: 18, marginBottom: 10 }]}>About this program</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              placeholder="What students will learn, the vibe, who it's for…"
              value={value}
              onChangeText={onChange}
              error={error?.message}
              multiline
              numberOfLines={4}
            />
          )}
        />

        <Text style={[fgh, { marginTop: 18, marginBottom: 4 }]}>Things to know</Text>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginBottom: 10 }}>
          One point per line — shown to students as bullets.
        </Text>
        <Controller
          control={control}
          name="things_to_know"
          render={({ field: { onChange, value } }) => (
            <Input
              placeholder={'Bring your own instrument\nArrive 10 min early\nWear comfortable clothes'}
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
            />
          )}
        />

        <Text style={{ fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.mist, marginTop: 18, lineHeight: 18 }}>
          After creating the program, you'll add its batches (schedule, coach, fees).
        </Text>

        <Button
          variant="primary"
          block
          style={{ marginTop: 20, opacity: media.length < 3 ? 0.5 : 1 }}
          disabled={media.length < 3}
          loading={createProgram.isPending}
          onPress={handleSubmit(onSubmit)}
        >
          {media.length < 3 ? `Add ${3 - media.length} more media` : 'Create program'}
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({});
