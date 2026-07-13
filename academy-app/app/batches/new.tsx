import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Modal, Pressable, Switch, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, Input, Button, Chip, sansFor } from '@findemy/ui';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { useStudioCoaches, useCreateBatch, useCreateCoach, useStudioProgram } from '@/hooks/useStudioQueries';

// S1.3: discounts are entered as whole percentages, capped at 30% (≡ 3000 bps server-side).
const discountPct = z
  .string()
  .regex(/^\d+$/, 'Enter a whole percentage')
  .refine((v) => Number(v) <= 30, 'Discount cannot exceed 30%');

const schema = z.object({
  capacity: z
    .string()
    .regex(/^\d+$/, 'Enter a whole number')
    .refine((v) => Number(v) >= 1, 'Capacity must be at least 1'),
  trial_fee: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
  monthly_fee: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
  // S3.4: classes per month (the explicit entitled count).
  sessions_per_month: z
    .string()
    .regex(/^\d+$/, 'Enter a whole number')
    .refine((v) => Number(v) >= 1 && Number(v) <= 31, '1–31 classes'),
  quarterly_discount: discountPct,
  annual_discount: discountPct,
});

type FormData = z.infer<typeof schema>;

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function NewBatchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { show: showToast } = useToast();
  // Every batch is created under a program (no standalone creation). Reached from a program's
  // "Add batch". Program owns title/category/description — this form only sets batch fields.
  const { program_id } = useLocalSearchParams<{ program_id?: string }>();
  const { data: programData } = useStudioProgram(program_id ?? '');
  const program = programData?.program;
  const [level, setLevel] = useState('Beginner');
  // S1.3: canonical Mode vocabulary ('in-studio' | 'online') end-to-end.
  const [mode, setMode] = useState<'in-studio' | 'online'>('in-studio');
  const [coachId, setCoachId] = useState('');
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachName, setCoachName] = useState('');
  const [coachSpecialty, setCoachSpecialty] = useState('');
  const { data: coachesData, refetch: refetchCoaches } = useStudioCoaches();
  const coaches = coachesData?.items ?? [];
  const createBatch = useCreateBatch();
  const createCoach = useCreateCoach();

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { capacity: '', trial_fee: '', monthly_fee: '', sessions_per_month: '', quarterly_discount: '0', annual_discount: '0' },
  });

  const onSubmit = async (data: FormData) => {
    if (!program_id) {
      Alert.alert('Program required', 'Open a program and use “Add batch”.');
      return;
    }
    if (!coachId) {
      Alert.alert('Coach required', 'Please select a coach for this batch.');
      return;
    }
    try {
      await createBatch.mutateAsync({
        program_id,
        level,
        capacity: Number(data.capacity),
        trial_fee_paise: Number(data.trial_fee) * 100,
        monthly_fee_paise: Number(data.monthly_fee) * 100,
        sessions_per_month: Number(data.sessions_per_month),
        quarterly_discount_bps: Number(data.quarterly_discount) * 100,
        annual_discount_bps: Number(data.annual_discount) * 100,
        coach_id: coachId,
        mode,
      });
      showToast('Batch created', 'success');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create batch');
    }
  };

  const handleCreateCoach = async () => {
    if (!coachName.trim() || !coachSpecialty.trim()) {
      Alert.alert('Required', 'Name and specialty are required.');
      return;
    }
    try {
      const response = await createCoach.mutateAsync({ name: coachName.trim(), specialty: coachSpecialty.trim() });
      await refetchCoaches();
      const newCoachId = (response as any)?.coach?.id;
      if (typeof newCoachId === 'string' && newCoachId) {
        setCoachId(newCoachId);
      } else {
        // Don't silently clear the current selection if the response shape changed.
        console.warn('[batches/new] createCoach returned no coach.id; leaving selection unchanged', response);
      }
      setCoachName('');
      setCoachSpecialty('');
      setShowCoachModal(false);
      showToast('Coach added', 'success');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create coach');
    }
  };

  // Prototype `.fg-h`: uppercase, bold, small, letter-spaced field headings.
  const fgh = {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: theme.color.whisper,
  };

  return (
    <Screen header={<ScreenHeader title="New batch" showBack />} bottomTab={null} scroll>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {/* Program context — title/category/description are owned by the program. */}
        <View style={{ backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18 }}>
          <Text style={[fgh, { marginBottom: 4 }]}>Program</Text>
          <Text style={{ fontFamily: sansFor(700), fontSize: 15, color: theme.color.ink }}>
            {program?.title ?? '—'}
          </Text>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 3, textTransform: 'capitalize' }}>
            {program?.category ?? ''}
          </Text>
        </View>

        <Text style={[fgh, { marginTop: 2, marginBottom: 10 }]}>Level</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {LEVELS.map((levelOption) => (
            <Chip key={levelOption} label={levelOption} selected={level === levelOption} onPress={() => setLevel(levelOption)} />
          ))}
        </View>

        <Controller
          control={control}
          name="capacity"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="Capacity" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
          )}
        />

        <View style={{ marginTop: 16 }}>
          <Controller
            control={control}
            name="trial_fee"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input placeholder="Trial fee (₹)" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
            )}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <Controller
            control={control}
            name="monthly_fee"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input placeholder="Monthly fee (₹)" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
            )}
          />
        </View>

        {/* S3.4: classes per month — the entitled count used for make-good */}
        <View style={{ marginTop: 16 }}>
          <Controller
            control={control}
            name="sessions_per_month"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input placeholder="Classes per month" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
            )}
          />
        </View>

        {/* S1.3: academy-set quarterly/annual discounts (≤30%) */}
        <Text style={[fgh, { marginTop: 22, marginBottom: 10 }]}>Plan discounts (applied at enrolment)</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="quarterly_discount"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Input placeholder="Quarterly %" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="annual_discount"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Input placeholder="Annual %" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
              )}
            />
          </View>
        </View>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 6 }}>
          Max 30%. Monthly plans are never discounted.
        </Text>

        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={fgh}>Coach</Text>
            <Pressable onPress={() => setShowCoachModal(true)}>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.persimmon, fontWeight: '600' }}>
                + New coach
              </Text>
            </Pressable>
          </View>
          {coaches.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {coaches.map((coach: any) => (
                <Chip key={coach.id} label={coach.name} selected={coachId === coach.id} onPress={() => setCoachId(coach.id)} />
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
              No coaches yet. Tap "+ New coach" to add one.
            </Text>
          )}
        </View>

        <View style={newStyles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.ink }}>Online class</Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
              Students join via video call
            </Text>
          </View>
          <Switch
            value={mode === 'online'}
            onValueChange={(v) => setMode(v ? 'online' : 'in-studio')}
            trackColor={{ true: theme.color.jade, false: theme.color.hairline }}
          />
        </View>

        <View style={{ marginTop: 32 }}>
          <Button block loading={createBatch.isPending} onPress={handleSubmit(onSubmit)}>
            Create batch
          </Button>
        </View>
      </ScrollView>

      {/* Inline coach creation modal */}
      <Modal visible={showCoachModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: theme.color.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink, marginBottom: 20 }}>
              New coach
            </Text>
            <Input placeholder="Name" value={coachName} onChangeText={setCoachName} />
            <View style={{ marginTop: 12 }}>
              <Input placeholder="Specialty (e.g. Guitar, Classical Dance)" value={coachSpecialty} onChangeText={setCoachSpecialty} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <View style={{ flex: 1 }}>
                <Button block onPress={() => { setShowCoachModal(false); setCoachName(''); setCoachSpecialty(''); }}>
                  Cancel
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button block loading={createCoach.isPending} onPress={handleCreateCoach}>
                  Add coach
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const newStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
});
