import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, sansFor, Input, Button } from '@findemy/ui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegChoice } from '@/components/SegChoice';
import { useCreateWorkshop } from '@/hooks/useStudioQueries';
import type { WorkshopType } from '@findemy/types';

const schema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24h)'),
    duration_min: z.string().regex(/^\d+$/, 'Enter a whole number'),
    capacity: z.string().regex(/^\d+$/, 'Enter a whole number'),
    price: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
    location: z.string().optional(),
  })
  .refine((d) => !isNaN(new Date(`${d.start_date}T${d.start_time}`).getTime()), {
    message: 'That date/time is not valid',
    path: ['start_date'],
  });

type FormData = z.infer<typeof schema>;

export default function NewWorkshopScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [type, setType] = useState<WorkshopType>('offline');
  const createWorkshop = useCreateWorkshop();

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', start_date: '', start_time: '', duration_min: '90', capacity: '20', price: '0', location: '' },
  });

  const submit = (status: 'draft' | 'upcoming') =>
    handleSubmit(async (data: FormData) => {
      try {
        const startAt = new Date(`${data.start_date}T${data.start_time}`).toISOString();
        await createWorkshop.mutateAsync({
          type,
          title: data.title,
          description: data.description,
          start_at: startAt,
          duration_min: Number(data.duration_min),
          location: type === 'offline' ? data.location || undefined : undefined,
          capacity: Number(data.capacity),
          price_paise: Math.round(Number(data.price)) * 100,
          status,
        });
        router.back();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to create workshop');
      }
    });

  const Label = ({ children }: { children: string }) => (
    <Text style={[styles.fgh, { color: theme.color.whisper }]}>{children}</Text>
  );

  return (
    <Screen
      header={<ScreenHeader title="New workshop" showBack />}
      bottomTab={null}
      scroll
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button variant="ghost" block loading={createWorkshop.isPending} onPress={submit('draft')}>
              Save draft
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="primary" block loading={createWorkshop.isPending} onPress={submit('upcoming')}>
              Publish
            </Button>
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        <Label>Title</Label>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="e.g. Songwriting 101" value={value} onChangeText={onChange} error={error?.message} />
          )}
        />

        <Label>Format</Label>
        <SegChoice
          items={[
            { key: 'offline', label: 'In studio' },
            { key: 'online', label: 'Online' },
          ]}
          value={type}
          onChange={(k) => setType(k as WorkshopType)}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Label>Date</Label>
            <Controller
              control={control}
              name="start_date"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Input placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} error={error?.message} />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Time</Label>
            <Controller
              control={control}
              name="start_time"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Input placeholder="HH:MM" value={value} onChangeText={onChange} error={error?.message} />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Label>Fee (₹)</Label>
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, value } }) => (
                <Input placeholder="0 for free" keyboardType="number-pad" value={value} onChangeText={onChange} />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Capacity</Label>
            <Controller
              control={control}
              name="capacity"
              render={({ field: { onChange, value } }) => (
                <Input placeholder="20" keyboardType="number-pad" value={value} onChangeText={onChange} />
              )}
            />
          </View>
        </View>

        <Label>Duration (min)</Label>
        <Controller
          control={control}
          name="duration_min"
          render={({ field: { onChange, value } }) => (
            <Input placeholder="90" keyboardType="number-pad" value={value} onChangeText={onChange} />
          )}
        />

        {type === 'offline' ? (
          <>
            <Label>Location</Label>
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, value } }) => (
                <Input placeholder="e.g. Hauz Khas, New Delhi" value={value} onChangeText={onChange} />
              )}
            />
          </>
        ) : null}

        <Label>About</Label>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="What will attendees do & learn?" value={value} onChangeText={onChange} error={error?.message} multiline numberOfLines={3} />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingBottom: 16 },
  fgh: { fontFamily: sansFor(700), fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
});
