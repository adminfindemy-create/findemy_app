import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, sansFor } from '@findemy/ui';
import { useBatchStudents, useStudioBatch } from '@/hooks/useStudioQueries';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TierBadge } from '@/components/students/TierBadge';

function StudentRow({ student }: { student: any }) {
  const theme = useTheme();
  const router = useRouter();

  const openWhatsApp = () => {
    if (!student.phone) {
      Alert.alert('No phone number', 'This student has no phone number on file.');
      return;
    }
    const msg = encodeURIComponent(
      `Hi ${student.name}, this is a reminder for your upcoming class. See you soon!`
    );
    Linking.openURL(`https://wa.me/${student.phone.replace(/\D/g, '')}?text=${msg}`);
  };

  const initial = student.name?.[0]?.toUpperCase() ?? '?';
  const hasPct = student.attendance_pct !== null && student.attendance_pct !== undefined;

  return (
    <Pressable
      style={[styles.row, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
      onPress={() => router.push(`/students/${student.id}` as any)}
    >
      <View style={[styles.avatar, { backgroundColor: theme.color.persimmon }]}>
        <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 14, color: theme.color.ivory }}>
          {initial}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={{ fontFamily: sansFor(500), fontSize: 12, color: theme.color.mist, marginTop: 2 }} numberOfLines={1}>
          {hasPct ? `${student.attendance_pct}%` : 'New'}
          {student.last_seen ? ` · last seen ${student.last_seen}` : ''}
        </Text>
      </View>

      <Pressable
        onPress={openWhatsApp}
        style={[styles.waBtn, { backgroundColor: '#25D366' }]}
        hitSlop={8}
      >
        <Text style={{ fontSize: 14 }}>💬</Text>
      </Pressable>

      <TierBadge tier={student.tier} />
    </Pressable>
  );
}

export default function BatchStudentsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: batchData } = useStudioBatch(id);
  const { data, isLoading } = useBatchStudents(id);

  const batchTitle = batchData?.batch?.title ?? 'Batch';
  const students = data?.students ?? [];

  return (
    <Screen
      header={<ScreenHeader title={`Students · ${batchTitle}`} showBack />}
      bottomTab={null}
      scroll={false}
    >
      <FlatList
        data={isLoading ? [] : students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentRow student={item} />}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 60 }}
        ListEmptyComponent={
          isLoading ? (
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, textAlign: 'center', marginTop: 40 }}>
              Loading…
            </Text>
          ) : (
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 }}>
              No enrolled students yet.
            </Text>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  waBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
