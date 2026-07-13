import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, TextInput } from 'react-native';
import { useTheme, Button, Chip, sansFor, tokens } from '@findemy/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStudioBatch, useDeleteBatch, useUpdateBatch, useStudioCoaches } from '@/hooks/useStudioQueries';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CATEGORIES = ['music', 'dance', 'arts', 'yoga'] as const;
type Cat = (typeof CATEGORIES)[number];

export default function BatchEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { data: batchData } = useStudioBatch(id);
  const { data: coachesData } = useStudioCoaches();
  const deleteBatch = useDeleteBatch();
  const updateBatch = useUpdateBatch(id);

  const existing = batchData?.batch;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Cat>('music');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');
  const [thingsToKnow, setThingsToKnow] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [trialFee, setTrialFee] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [sessionsPerMonth, setSessionsPerMonth] = useState('8');
  const [coachId, setCoachId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  // S1.3: canonical Mode vocabulary ('in-studio' | 'online').
  const [mode, setMode] = useState<'in-studio' | 'online'>('in-studio');
  const [quarterlyDiscount, setQuarterlyDiscount] = useState('0');
  const [annualDiscount, setAnnualDiscount] = useState('0');
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('18:00');
  const [durationMin, setDurationMin] = useState('60');

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title || '');
    setCategory((existing.category as Cat) ?? 'music');
    setLevel(existing.level || '');
    setDescription((existing as any).description ?? '');
    setThingsToKnow(((existing as any).things_to_know ?? []).join('\n'));
    setCapacity(existing.capacity ? String(existing.capacity) : '10');
    setTrialFee(existing.trial_fee_paise ? String(existing.trial_fee_paise / 100) : '');
    setMonthlyFee(existing.monthly_fee_paise ? String(existing.monthly_fee_paise / 100) : '');
    setSessionsPerMonth(String(existing.sessions_per_month ?? 8));
    setCoachId(existing.coach_id || '');
    setStatus(existing.status === 'inactive' ? 'inactive' : 'active');
    setMode(existing.mode === 'online' ? 'online' : 'in-studio');
    // bps → whole percent for the inputs
    setQuarterlyDiscount(String(Math.round((existing.quarterly_discount_bps ?? 0) / 100)));
    setAnnualDiscount(String(Math.round((existing.annual_discount_bps ?? 0) / 100)));
    const timings = existing.timings ?? [];
    if (timings.length) {
      setDays([...new Set(timings.map((timing) => timing.day_of_week))].sort());
      setStartTime(timings[0].start_time || '18:00');
      setDurationMin(String(timings[0].duration_min || 60));
    }
  }, [existing]);

  const toggleDay = (dayNum: number) =>
    setDays((prev) => (prev.includes(dayNum) ? prev.filter((day) => day !== dayNum) : [...prev, dayNum].sort()));

  const onSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a batch title.');
      return;
    }
    const q = Number(quarterlyDiscount) || 0;
    const a = Number(annualDiscount) || 0;
    if (q > 30 || a > 30) {
      Alert.alert('Discount too high', 'Quarterly and annual discounts cannot exceed 30%.');
      return;
    }
    const dur = Number(durationMin) || 60;
    const timings = days.map((dayNum) => ({ day_of_week: dayNum, start_time: startTime, duration_min: dur }));
    try {
      const things = thingsToKnow.split('\n').map((line) => line.trim()).filter(Boolean);
      await updateBatch.mutateAsync({
        title: title.trim(),
        category,
        level: level.trim(),
        description: description.trim(),
        things_to_know: things,
        capacity: Number(capacity) || 1,
        trial_fee_paise: Math.round((Number(trialFee) || 0) * 100),
        monthly_fee_paise: Math.round((Number(monthlyFee) || 0) * 100),
        sessions_per_month: Number(sessionsPerMonth) || 1,
        quarterly_discount_bps: q * 100,
        annual_discount_bps: a * 100,
        coach_id: coachId || undefined,
        status,
        mode,
        timings,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save batch');
    }
  };

  const onPause = () => {
    Alert.alert(
      status === 'active' ? 'Pause this batch?' : 'Resume this batch?',
      status === 'active'
        ? 'Stops new sign-ups. Enrolled students are notified.'
        : 'Re-opens the batch for new sign-ups.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'active' ? 'Pause' : 'Resume',
          onPress: async () => {
            const next = status === 'active' ? 'inactive' : 'active';
            setStatus(next);
            try {
              await updateBatch.mutateAsync({ status: next });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed');
            }
          },
        },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert('Delete Batch', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBatch.mutateAsync(id);
            router.dismissAll?.();
            router.replace('/(tabs)/schedule' as never);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete batch');
          }
        },
      },
    ]);
  };

  const coaches = coachesData?.items ?? [];
  const inputStyle = [styles.input, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, color: theme.color.ink }];
  const label = (t: string) => (
    <Text style={[styles.glabel, { color: theme.color.mist }]}>{t}</Text>
  );

  return (
    <Screen header={<ScreenHeader title="Edit batch" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {label('NAME')}
        <TextInput value={title} onChangeText={setTitle} placeholder="Batch title" placeholderTextColor={theme.color.mist} style={inputStyle} />

        {label('CATEGORY')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((categoryOption) => (
            <Chip key={categoryOption} label={categoryOption} selected={category === categoryOption} onPress={() => setCategory(categoryOption)} />
          ))}
        </View>

        {label('LEVEL')}
        <TextInput value={level} onChangeText={setLevel} placeholder="e.g. Beginner" placeholderTextColor={theme.color.mist} style={inputStyle} />

        {label('ABOUT THIS BATCH')}
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What students will learn, the vibe, who it's for…"
          placeholderTextColor={theme.color.mist}
          multiline
          style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
        />

        {label('THINGS TO KNOW')}
        <TextInput
          value={thingsToKnow}
          onChangeText={setThingsToKnow}
          placeholder={'One point per line\nBring your own instrument\nArrive 10 min early'}
          placeholderTextColor={theme.color.mist}
          multiline
          style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
        />

        {label('DAYS')}
        <View style={styles.dayRow}>
          {DAY_LABELS.map((label, index) => {
            const on = days.includes(index);
            return (
              <Pressable
                key={index}
                onPress={() => toggleDay(index)}
                style={[
                  styles.dayToggle,
                  { backgroundColor: on ? theme.color.ink : theme.color.ivory, borderColor: on ? theme.color.ink : theme.color.hairline },
                ]}
              >
                <Text style={{ fontFamily: theme.font.sans, fontSize: 12, fontWeight: '600', color: on ? theme.color.ivory : theme.color.inkSoft }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {label('TIME')}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <TextInput value={startTime} onChangeText={setStartTime} placeholder="18:00" placeholderTextColor={theme.color.mist} style={inputStyle} />
            <Text style={[styles.hint, { color: theme.color.mist }]}>Start (HH:MM)</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TextInput value={durationMin} onChangeText={setDurationMin} keyboardType="number-pad" placeholder="60" placeholderTextColor={theme.color.mist} style={inputStyle} />
            <Text style={[styles.hint, { color: theme.color.mist }]}>Duration (min)</Text>
          </View>
        </View>

        {label('MODE')}
        <View style={styles.twoCol}>
          {(['in-studio', 'online'] as const).map((modeOption) => {
            const on = mode === modeOption;
            return (
              <Pressable
                key={modeOption}
                onPress={() => setMode(modeOption)}
                style={[
                  styles.modeCard,
                  { backgroundColor: on ? theme.color.persimmonSoft : theme.color.ivory, borderColor: on ? theme.color.persimmon : theme.color.hairline },
                ]}
              >
                <Text style={{ fontFamily: theme.font.sans, fontSize: 13, fontWeight: '600', color: theme.color.ink }}>
                  {modeOption === 'in-studio' ? 'In studio' : 'Online'}
                </Text>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 10, color: theme.color.mist, marginTop: 2 }}>
                  {modeOption === 'in-studio' ? 'At your address' : 'Join via video call'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {label('PLAN DISCOUNTS (≤30%)')}
        <View style={styles.twoCol}>
          <View style={[styles.priceTile, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={[styles.priceLabel, { color: theme.color.mist }]}>QUARTERLY %</Text>
            <TextInput value={quarterlyDiscount} onChangeText={setQuarterlyDiscount} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.color.mist} style={[styles.priceInput, { color: theme.color.ink }]} />
          </View>
          <View style={[styles.priceTile, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={[styles.priceLabel, { color: theme.color.mist }]}>ANNUAL %</Text>
            <TextInput value={annualDiscount} onChangeText={setAnnualDiscount} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.color.mist} style={[styles.priceInput, { color: theme.color.ink }]} />
          </View>
        </View>

        {existing?.trial_spots != null ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 10 }}>
            {existing.trial_spots} trial spot{existing.trial_spots === 1 ? '' : 's'} open · spots open automatically (capacity − enrolled)
          </Text>
        ) : null}

        {label('PRICING')}
        <View style={styles.twoCol}>
          <View style={[styles.priceTile, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={[styles.priceLabel, { color: theme.color.mist }]}>TRIAL ₹</Text>
            <TextInput value={trialFee} onChangeText={setTrialFee} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.color.mist} style={[styles.priceInput, { color: theme.color.ink }]} />
          </View>
          <View style={[styles.priceTile, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={[styles.priceLabel, { color: theme.color.mist }]}>MONTHLY ₹</Text>
            <TextInput value={monthlyFee} onChangeText={setMonthlyFee} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.color.mist} style={[styles.priceInput, { color: theme.color.ink }]} />
          </View>
          <View style={[styles.priceTile, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={[styles.priceLabel, { color: theme.color.mist }]}>CAPACITY</Text>
            <TextInput value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="10" placeholderTextColor={theme.color.mist} style={[styles.priceInput, { color: theme.color.ink }]} />
          </View>
          {/* S3.4: classes per month — the entitled count */}
          <View style={[styles.priceTile, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={[styles.priceLabel, { color: theme.color.mist }]}>CLASSES/MO</Text>
            <TextInput value={sessionsPerMonth} onChangeText={setSessionsPerMonth} keyboardType="number-pad" placeholder="8" placeholderTextColor={theme.color.mist} style={[styles.priceInput, { color: theme.color.ink }]} />
          </View>
        </View>

        {coaches.length > 0 && (
          <>
            {label('INSTRUCTOR')}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {coaches.map((coach: any) => (
                <Chip key={coach.id} label={coach.name} selected={coachId === coach.id} onPress={() => setCoachId(coach.id)} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
        <Button onPress={onSubmit} block loading={updateBatch.isPending}>
          Save changes
        </Button>

        {/* Pause danger row */}
        <View style={[styles.dangerRow, { backgroundColor: theme.color.roseSoft, borderColor: theme.color.rose }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, fontWeight: '600', color: theme.color.ink }}>
              {status === 'active' ? 'Pause this batch' : 'Batch is paused'}
            </Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.inkSoft, marginTop: 2 }}>
              Stops new sign-ups · students notified
            </Text>
          </View>
          <Pressable onPress={onPause}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.rose, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {status === 'active' ? 'Pause' : 'Resume'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 12 }} />
        <Button onPress={onDelete} block variant="ghost" loading={deleteBatch.isPending}>
          Delete batch
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16, gap: 6 },
  glabel: {
    fontFamily: sansFor(700),
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: sansFor(400),
  },
  hint: { fontFamily: sansFor(400), fontSize: 10, marginTop: 4, marginLeft: 2 },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoCol: { flexDirection: 'row', gap: 8 },
  modeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priceTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  priceLabel: {
    fontFamily: sansFor(700),
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceInput: {
    fontFamily: tokens.font.serif,
    fontSize: 22,
    padding: 0,
  },
  dangerRow: {
    marginTop: 14,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
