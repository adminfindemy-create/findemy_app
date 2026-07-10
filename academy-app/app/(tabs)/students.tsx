import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, sansFor, Button, Chip, IconSearch, IconSliders, IconX } from '@findemy/ui';
import { useStudioStudents, useStudioBatches } from '@/hooks/useStudioQueries';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebounce } from '@/hooks/useDebounce';
import { TierBadge } from '@/components/TierBadge';

const ATTENDANCE_TIERS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'irregular', label: 'Irregular' },
  { key: 'inactive', label: 'Inactive' },
];

// Full labels used inside the Filters sheet.
const ATTENDANCE_FULL = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active ≥75%' },
  { key: 'irregular', label: 'Irregular 50–74%' },
  { key: 'inactive', label: 'Inactive <50%' },
];

function StudentRow({ student }: { student: any }) {
  const theme = useTheme();
  const router = useRouter();
  const initial = student.name?.[0]?.toUpperCase() ?? '?';
  const batches = student.batches?.map((batch: any) => batch.title ?? batch).filter(Boolean) ?? [];
  const sub = [
    batches[0] ?? 'No active batch',
    student.attendance_pct != null ? `${student.attendance_pct}% attendance` : null,
  ].filter(Boolean).join(' · ');
  return (
    <Pressable
      style={[styles.rowCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}
      onPress={() => router.push(`/students/${student.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`${student.name}${student.tier ? `, ${student.tier}` : ''}`}
    >
      <View style={[styles.av, { backgroundColor: theme.color.persimmon }]}>
        <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 16, color: theme.color.ivory }}>
          {initial}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, marginTop: 3 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <TierBadge tier={student.tier} />
    </Pressable>
  );
}

export default function StudentsScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [batchId, setBatchId] = useState('');
  const [attendanceTier, setAttendanceTier] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Draft filters inside the sheet — applied on "Apply".
  const [draftBatch, setDraftBatch] = useState('');
  const [draftTier, setDraftTier] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: studentsData, isLoading } = useStudioStudents({
    q: debouncedQuery,
    batch_id: batchId || undefined,
    attendance_tier: attendanceTier || undefined,
  });
  const { data: batchesData } = useStudioBatches();

  const allStudents = studentsData?.items ?? [];
  const allBatches = batchesData?.items ?? [];
  const unfiltered = !attendanceTier && !batchId && !debouncedQuery;

  const renderStudent = useCallback(({ item }: { item: any }) => <StudentRow student={item} />, []);

  const openFilters = () => {
    setDraftBatch(batchId);
    setDraftTier(attendanceTier);
    setFiltersOpen(true);
  };
  const applyFilters = () => {
    setBatchId(draftBatch);
    setAttendanceTier(draftTier);
    setFiltersOpen(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      {/* Header */}
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1.8, color: theme.color.persimmon }}>
            ROSTER
          </Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, color: theme.color.ink, marginTop: 4 }}>
            Students
          </Text>
        </View>
        <Pressable
          onPress={openFilters}
          style={[styles.iconBtn, { backgroundColor: batchId ? theme.color.ink : theme.color.ivory, borderColor: batchId ? theme.color.ink : theme.color.hairline }]}
          accessibilityRole="button"
          accessibilityLabel="Filter students"
        >
          <IconSliders size={18} color={batchId ? theme.color.ivory : theme.color.ink} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.search, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
          <IconSearch size={16} color={theme.color.mist} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search students…"
            placeholderTextColor={theme.color.mist}
            style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 14, color: theme.color.ink, paddingVertical: 0 }}
          />
        </View>
      </View>

      {/* Quick attendance pills */}
      <FlatList
        data={allStudents}
        keyExtractor={(item: any) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.pills}>
            {ATTENDANCE_TIERS.map((tier) => {
              const selected = tier.key === attendanceTier;
              const label = tier.key === '' && unfiltered ? `All · ${allStudents.length}` : tier.label;
              return (
                <Pressable
                  key={tier.key}
                  onPress={() => setAttendanceTier(tier.key)}
                  style={[styles.pill, { backgroundColor: selected ? theme.color.ink : theme.color.ivory, borderColor: selected ? theme.color.ink : theme.color.hairline }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: selected ? theme.color.ivory : theme.color.inkSoft }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 }}>
              No students match these filters.
            </Text>
          )
        }
      />

      {/* Filters bottom sheet — Batch × Attendance (single-select each) */}
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setFiltersOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
          <View style={[styles.grab, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.sheetHead}>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 24, color: theme.color.ink }}>Filter students</Text>
            <Pressable hitSlop={8} onPress={() => setFiltersOpen(false)}>
              <IconX size={20} color={theme.color.mist} />
            </Pressable>
          </View>

          <Text style={[styles.sheetLabel, { color: theme.color.whisper }]}>BATCH</Text>
          <View style={styles.sheetWrap}>
            <Chip label="All batches" selected={!draftBatch} onPress={() => setDraftBatch('')} />
            {allBatches.map((batch: any) => (
              <Chip key={batch.id} label={batch.title} selected={draftBatch === batch.id} onPress={() => setDraftBatch(batch.id)} />
            ))}
          </View>

          <Text style={[styles.sheetLabel, { color: theme.color.whisper, marginTop: 18 }]}>ATTENDANCE</Text>
          <View style={styles.sheetWrap}>
            {ATTENDANCE_FULL.map((tier) => (
              <Chip key={tier.key} label={tier.label} selected={draftTier === tier.key} onPress={() => setDraftTier(tier.key)} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <Button variant="ghost" onPress={() => { setDraftBatch(''); setDraftTier(''); }}>
              Clear
            </Button>
            <Button variant="dark" block style={{ flex: 1 }} onPress={applyFilters}>
              Apply filters
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  searchWrap: { paddingHorizontal: 22, paddingBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  av: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 22,
    marginBottom: 10,
  },
  list: { paddingBottom: 120, paddingTop: 0 },
  scrim: { flex: 1, backgroundColor: 'rgba(20,16,14,0.5)' },
  sheet: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 32, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetLabel: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 12, letterSpacing: 1, marginBottom: 10 },
  sheetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
