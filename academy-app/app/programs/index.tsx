import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, sansFor, Button, IconChevR } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useStudioPrograms } from '@/hooks/useStudioQueries';
import { ErrorState } from '@/components/ErrorState';

const CATEGORY_COLORS: Record<string, string> = {
  music: '#5C2A4A',
  dance: '#1E5C5A',
  yoga: '#8A8A33',
};

export default function ProgramsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useStudioPrograms();

  const programs = data?.items ?? [];

  return (
    <Screen header={<ScreenHeader title="Programs" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {isLoading ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        ) : isError ? (
          <ErrorState message="Couldn't load programs." onRetry={refetch} />
        ) : programs.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
            <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>No programs yet</Text>
            <Button variant="primary" onPress={() => router.push('/programs/new')}>Create your first program</Button>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {programs.map((program) => {
              const cat = (program.category ?? '').toLowerCase();
              const dot = cat === 'arts' ? theme.color.persimmon : (CATEGORY_COLORS[cat] ?? theme.color.mist);
              const sub = [
                cat ? cat[0].toUpperCase() + cat.slice(1) : null,
                `${program.batch_count} batch${program.batch_count === 1 ? '' : 'es'}`,
              ].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={program.id}
                  onPress={() => router.push(`/programs/${program.id}`)}
                  style={[styles.rowCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}
                >
                  {(program as any).cover_url ? (
                    <Image source={{ uri: (program as any).cover_url }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: dot, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontFamily: theme.font.serif, fontSize: 20, color: '#fff' }}>{program.title?.[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: sansFor(700), fontSize: 14.5, color: theme.color.ink }} numberOfLines={1}>
                      {program.title}
                    </Text>
                    <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, marginTop: 3 }} numberOfLines={1}>
                      {sub}
                    </Text>
                  </View>
                  <IconChevR size={18} color={theme.color.whisper} />
                </Pressable>
              );
            })}
            <Button variant="primary" block style={{ marginTop: 8 }} onPress={() => router.push('/programs/new')}>
              New program
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 14 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cdot: { width: 11, height: 11, borderRadius: 5.5, flexShrink: 0 },
  thumb: { width: 52, height: 52, borderRadius: 12, flexShrink: 0 },
});
