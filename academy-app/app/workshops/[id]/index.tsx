import { ErrorState } from '@/components/common/ErrorState';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SegChoice } from '@/components/common/SegChoice';
import { useDeleteWorkshop, useStudioWorkshops, useUpdateWorkshop } from '@/hooks/useStudioQueries';
import type { WorkshopType } from '@findemy/types';
import { Button, IconChevR, IconUsers, Input, sansFor, useTheme } from '@findemy/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

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
  .refine((d) => !Number.isNaN(new Date(`${d.start_date}T${d.start_time}`).getTime()), {
    message: 'That date/time is not valid',
    path: ['start_date'],
  });

type FormData = z.infer<typeof schema>;

export default function EditWorkshopScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useStudioWorkshops();
  const workshop = data?.items.find((workshopItem) => workshopItem.id === id);
  const updateWorkshop = useUpdateWorkshop(id);
  const deleteWorkshop = useDeleteWorkshop();
  const [type, setType] = useState<WorkshopType>('offline');

  const { control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      start_time: '',
      duration_min: '90',
      capacity: '20',
      price: '0',
      location: '',
    },
  });

  useEffect(() => {
    if (!workshop) return;
    const date = new Date(workshop.start_at);
    setType(workshop.type);
    reset({
      title: workshop.title,
      description: workshop.description,
      start_date: date.toISOString().slice(0, 10),
      start_time: date.toTimeString().slice(0, 5),
      duration_min: String(workshop.duration_min),
      capacity: String(workshop.capacity),
      price: String(Math.round(workshop.price_paise / 100)),
      location: workshop.location ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);

  const onSubmit = async (data: FormData) => {
    try {
      const startAt = new Date(`${data.start_date}T${data.start_time}`).toISOString();
      await updateWorkshop.mutateAsync({
        type,
        title: data.title,
        description: data.description,
        start_at: startAt,
        duration_min: Number(data.duration_min),
        location: type === 'offline' ? data.location || undefined : undefined,
        capacity: Number(data.capacity),
        price_paise: Math.round(Number(data.price)) * 100,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update workshop');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete workshop', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkshop.mutateAsync(id);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const Label = ({ children }: { children: string }) => (
    <Text style={[styles.fgh, { color: theme.color.whisper }]}>{children}</Text>
  );

  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Workshop" showBack />} bottomTab={null}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color={theme.color.persimmon} />
        </View>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen header={<ScreenHeader title="Workshop" showBack />} bottomTab={null}>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }
  if (!workshop) {
    return (
      <Screen header={<ScreenHeader title="Workshop" showBack />} bottomTab={null}>
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>
            Workshop not found.
          </Text>
          <Button onPress={() => router.back()}>Go back</Button>
        </View>
      </Screen>
    );
  }

  const isDraft = workshop.status === 'draft';

  return (
    <Screen
      header={<ScreenHeader title="Workshop" showBack />}
      bottomTab={null}
      scroll
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {isDraft ? (
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                block
                loading={updateWorkshop.isPending}
                onPress={async () => {
                  try {
                    await updateWorkshop.mutateAsync({ status: 'upcoming' } as any);
                    router.back();
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to publish');
                  }
                }}
              >
                Publish
              </Button>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              block
              loading={updateWorkshop.isPending}
              onPress={handleSubmit(onSubmit)}
            >
              Save changes
            </Button>
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        {/* Who booked → attendees list */}
        <Pressable
          onPress={() => router.push(`/workshops/${id}/attendees` as never)}
          style={[
            styles.bookedRow,
            { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
            theme.shadow.sm,
          ]}
        >
          <View style={[styles.bookedIcon, { backgroundColor: theme.color.persimmonSoft }]}>
            <IconUsers size={18} color={theme.color.persimmonDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>
              Who booked
            </Text>
            <Text
              style={{
                fontFamily: sansFor(600),
                fontSize: 12,
                color: theme.color.mist,
                marginTop: 1,
              }}
            >
              {workshop.registered_count} of {workshop.capacity} booked
            </Text>
          </View>
          <IconChevR size={18} color={theme.color.whisper} />
        </Pressable>

        <Label>Title</Label>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              placeholder="Workshop title"
              value={value}
              onChangeText={onChange}
              error={error?.message}
            />
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
                <Input
                  placeholder="YYYY-MM-DD"
                  value={value}
                  onChangeText={onChange}
                  error={error?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Time</Label>
            <Controller
              control={control}
              name="start_time"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Input
                  placeholder="HH:MM"
                  value={value}
                  onChangeText={onChange}
                  error={error?.message}
                />
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
                <Input
                  placeholder="0 for free"
                  keyboardType="number-pad"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Capacity</Label>
            <Controller
              control={control}
              name="capacity"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="20"
                  keyboardType="number-pad"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
        </View>

        <Label>Duration (min)</Label>
        <Controller
          control={control}
          name="duration_min"
          render={({ field: { onChange, value } }) => (
            <Input
              placeholder="90"
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        {type === 'offline' ? (
          <>
            <Label>Location</Label>
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="e.g. Hauz Khas, New Delhi"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </>
        ) : null}

        <Label>About</Label>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input
              placeholder="What will attendees do & learn?"
              value={value}
              onChangeText={onChange}
              error={error?.message}
              multiline
              numberOfLines={3}
            />
          )}
        />

        <View style={{ height: 20 }} />
        <Button variant="ghost" block loading={deleteWorkshop.isPending} onPress={onDelete}>
          <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.rose }}>
            Delete workshop
          </Text>
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingBottom: 16 },
  fgh: {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  bookedIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
