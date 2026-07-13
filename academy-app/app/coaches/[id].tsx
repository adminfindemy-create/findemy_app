import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input, Button, useTheme, sansFor, Summary, SummaryRow, IconCal, IconPhone, IconUser, IconChevR } from '@findemy/ui';
import { AvatarPicker } from '@/components/AvatarPicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  useStudioCoaches,
  useUpdateCoach,
  useDeleteCoach,
  useCoach,
  useAssignCoachToBatch,
  useStudioBatches,
} from '@/hooks/useStudioQueries';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CoachDetailScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const theme = useTheme();
  const { data: coachesData } = useStudioCoaches();
  const coach = coachesData?.items.find((coachItem: any) => coachItem.id === id);
  const updateCoach = useUpdateCoach(id);
  const deleteCoach = useDeleteCoach();

  // S4.2: coach detail (assigned batches) + assign-to-batch.
  const { data: coachDetail } = useCoach(id);
  const { data: batchesData } = useStudioBatches();
  const assign = useAssignCoachToBatch();
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const detail = coachDetail?.coach;
  const name = detail?.name ?? (coach as any)?.name ?? 'Coach';
  const specialty = detail?.specialty ?? (coach as any)?.specialty ?? '';
  const bio = detail?.bio ?? (coach as any)?.bio ?? '';
  const phone = detail?.phone ?? (coach as any)?.phone ?? '';
  const avatarUrl = (detail as any)?.avatar_url ?? (coach as any)?.avatar_url ?? null;
  const [editAvatar, setEditAvatar] = useState<string | null>(null);

  const assignedBatches = (detail?.batches ?? []) as { id: string; title: string }[];
  const assignedIds = new Set(assignedBatches.map((batch) => batch.id));
  const assignableBatches = ((batchesData?.items ?? []) as any[]).filter((batch) => !assignedIds.has(batch.id));

  const doAssign = async (batchId: string) => {
    setAssignOpen(false);
    try {
      await assign.mutateAsync({ batchId, coachId: id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to assign');
    }
  };

  const { control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', specialty: '', bio: '', phone: '' },
  });

  useEffect(() => {
    if (!coach && !detail) return;
    reset({ name, specialty, bio, phone });
    setEditAvatar(avatarUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach, detail]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateCoach.mutateAsync({
        name: data.name,
        specialty: data.specialty,
        bio: data.bio || undefined,
        phone: data.phone || undefined,
        avatar_url: editAvatar,
      });
      setEditOpen(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update coach');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete coach', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCoach.mutateAsync(id);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete coach');
          }
        },
      },
    ]);
  };

  const iconColor = theme.color.persimmon;

  return (
    <Screen
      header={
        <ScreenHeader
          title=""
          showBack
          rightAction={
            <Pressable onPress={() => setEditOpen(true)} hitSlop={8}>
              <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.persimmon }}>Edit</Text>
            </Pressable>
          }
        />
      }
      bottomTab={null}
      scroll
    >
      <View style={styles.container}>
        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={[styles.pic, { backgroundColor: theme.color.persimmon }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 34, color: theme.color.ivory }}>
                {name[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 26, color: theme.color.ink }}>{name}</Text>
          {specialty ? (
            <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.mist, marginTop: 3 }}>{specialty}</Text>
          ) : null}
        </View>

        {/* Summary (real data only) */}
        <Summary>
          <SummaryRow
            icon={<IconCal size={16} color={iconColor} />}
            label="Assigned batches"
            value={String(detail?.batch_count ?? assignedBatches.length)}
          />
          <SummaryRow
            icon={<IconPhone size={16} color={iconColor} />}
            label="Phone"
            value={
              phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${phone}`)}>
                  <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.persimmon }}>{phone}</Text>
                </Pressable>
              ) : (
                '—'
              )
            }
            last={!bio}
          />
          {bio ? <SummaryRow icon={<IconUser size={16} color={iconColor} />} label="Bio" value={bio} last /> : null}
        </Summary>

        {/* Assigned batch rows */}
        {assignedBatches.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.fgh}>Batches</Text>
            {assignedBatches.map((batch) => (
              <Pressable
                key={batch.id}
                onPress={() => router.push(`/batches/${batch.id}` as never)}
                style={[styles.batchRow, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
              >
                <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>{batch.title}</Text>
                <IconChevR size={16} color={theme.color.whisper} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
            Not assigned to any batch yet.
          </Text>
        )}

        {/* Reassign / assign */}
        <Button
          block
          variant="ghost"
          loading={assign.isPending}
          onPress={() => setAssignOpen(true)}
          disabled={assignableBatches.length === 0}
        >
          {assignableBatches.length === 0 ? 'All batches assigned' : 'Reassign batches'}
        </Button>

        <Button block variant="ghost" loading={deleteCoach.isPending} onPress={onDelete} style={{ marginTop: 4 }}>
          <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.rose }}>Delete coach</Text>
        </Button>
      </View>

      {/* Assign-to-batch picker */}
      <Modal visible={assignOpen} transparent animationType="slide" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setAssignOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
          <View style={[styles.grabber, { backgroundColor: theme.color.hairline }]} />
          <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink, marginBottom: 4 }}>Assign coach</Text>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, marginBottom: 14 }}>
            Add {name} to another batch.
          </Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {assignableBatches.map((batch: any) => (
              <Pressable
                key={batch.id}
                onPress={() => doAssign(batch.id)}
                style={[styles.batchRow, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, marginBottom: 8 }]}
              >
                <View>
                  <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>{batch.title}</Text>
                  <Text style={{ fontFamily: sansFor(500), fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
                    {batch.coach_name ? `Currently: ${batch.coach_name}` : 'No coach'}
                  </Text>
                </View>
                <IconChevR size={16} color={theme.color.whisper} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit coach */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setEditOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
          <View style={[styles.grabber, { backgroundColor: theme.color.hairline }]} />
          <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink, marginBottom: 14 }}>Edit coach</Text>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <AvatarPicker value={editAvatar} onChange={setEditAvatar} fallbackLetter={name[0]} />
          </View>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState: { error } }) => (
              <Input placeholder="Full name" value={field.value} onChangeText={field.onChange} error={error?.message} />
            )}
          />
          <View style={{ height: 12 }} />
          <Controller
            control={control}
            name="specialty"
            render={({ field, fieldState: { error } }) => (
              <Input placeholder="Specialty" value={field.value} onChangeText={field.onChange} error={error?.message} />
            )}
          />
          <View style={{ height: 12 }} />
          <Controller
            control={control}
            name="bio"
            render={({ field }) => (
              <Input placeholder="Bio (optional)" value={field.value} onChangeText={field.onChange} multiline numberOfLines={3} />
            )}
          />
          <View style={{ height: 12 }} />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input placeholder="Phone (optional)" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
            )}
          />
          <View style={{ height: 18 }} />
          <Button block loading={updateCoach.isPending} onPress={handleSubmit(onSubmit)}>
            Save changes
          </Button>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 8 },
  pic: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  fgh: { fontFamily: sansFor(700), fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8A8071' },
  batchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 36, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
});
