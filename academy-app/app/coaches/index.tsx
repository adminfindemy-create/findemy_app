import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, sansFor, Button, IconChevR, IconPlus } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useStudioCoaches } from '@/hooks/useStudioQueries';
import { ErrorState } from '@/components/ErrorState';

export default function CoachesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useStudioCoaches();
  const coaches = data?.items ?? [];

  return (
    <Screen header={<ScreenHeader title="Coaches" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {isLoading ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        ) : isError ? (
          <ErrorState message="Couldn't load coaches." onRetry={refetch} />
        ) : coaches.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
            <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>No coaches yet</Text>
            <Button variant="primary" onPress={() => router.push('/coaches/new')}>Add first coach</Button>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
              {coaches.map((coach: any, index: number) => (
                <Pressable
                  key={coach.id}
                  onPress={() => router.push(`/coaches/${coach.id}`)}
                  style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.color.hairline }]}
                >
                  <View style={[styles.pic, { backgroundColor: theme.color.persimmon }]}>
                    {coach.avatar_url ? (
                      <Image source={{ uri: coach.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 18, color: theme.color.ivory }}>
                        {coach.name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: sansFor(700), fontSize: 14.5, color: theme.color.ink }} numberOfLines={1}>
                      {coach.name}
                    </Text>
                    <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, marginTop: 2 }} numberOfLines={1}>
                      {[coach.specialty, typeof coach.batch_count === 'number' ? `${coach.batch_count} batch${coach.batch_count === 1 ? '' : 'es'}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <IconChevR size={18} color={theme.color.whisper} />
                </Pressable>
              ))}
            </View>

            <Button
              variant="primary"
              block
              icon={<IconPlus size={18} color="#fff" />}
              style={{ marginTop: 16 }}
              onPress={() => router.push('/coaches/new')}
            >
              Add coach
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 14 },
  card: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  pic: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
