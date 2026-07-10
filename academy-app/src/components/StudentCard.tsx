import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, Avatar, Spill } from '@findemy/ui';
import type { StudentListItem } from '@findemy/types';
import { useRouter } from 'expo-router';

export function StudentCard({ student }: { student: StudentListItem }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/students/${student.id}`)}
      style={[styles.card, { backgroundColor: theme.color.ivory }]}
    >
      <Avatar initial={student.name} tone="jade" size="md" />
      <View style={styles.info}>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 15, fontWeight: '600', color: theme.color.ink }}>
          {student.name}
        </Text>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
          {student.batches.map((b) => b.title).join(', ') || 'No batches'}
        </Text>
      </View>
      <Spill state={student.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
});
