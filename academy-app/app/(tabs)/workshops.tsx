import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, sansFor, Button, BlockPrintCover, IconPlus } from '@findemy/ui';
import { useStudioWorkshops } from '@/hooks/useStudioQueries';
import { formatRupees } from '@/lib/format';
import { Screen } from '@/components/Screen';
import { SegChoice } from '@/components/SegChoice';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ErrorState } from '@/components/ErrorState';
import type { Workshop } from '@findemy/types';

function statusInfo(w: Workshop, theme: any): { label: string; bg: string; fg: string } {
  if (w.status === 'draft') return { label: 'Draft', bg: theme.color.paperWarm, fg: theme.color.mist };
  if (w.live) return { label: 'Live now', bg: theme.color.persimmon, fg: '#fff' };
  const start = new Date(w.start_at).getTime();
  const soon = start - Date.now() > 0 && start - Date.now() < 60 * 60 * 1000;
  if (soon) return { label: 'Live soon', bg: theme.color.marigold, fg: '#fff' };
  if (start < Date.now()) return { label: 'Done', bg: theme.color.jade, fg: '#fff' };
  return { label: 'Upcoming', bg: theme.color.ink, fg: '#fff' };
}

function WorkshopCard({ workshop, variant, onPress }: { workshop: Workshop; variant: 1 | 2 | 3 | 4; onPress: () => void }) {
  const theme = useTheme();
  const date = new Date(workshop.start_at);
  const free = workshop.price_paise === 0;
  const price = free ? 'Free' : formatRupees(workshop.price_paise);
  const hrs =
    workshop.duration_min >= 60
      ? `${(workshop.duration_min / 60).toFixed(workshop.duration_min % 60 ? 1 : 0)} hrs`
      : `${workshop.duration_min} min`;
  const st = statusInfo(workshop, theme);
  const place = workshop.type === 'online' ? 'Online' : workshop.location || 'In-studio';
  const verb = free ? 'registered' : 'booked';

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
      <BlockPrintCover category="music" variant={variant} letter={workshop.title?.[0] ?? 'W'} height={120}>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={{ fontFamily: sansFor(800), fontSize: 10, letterSpacing: 0.4, color: st.fg, textTransform: 'uppercase' }}>{st.label}</Text>
        </View>
      </BlockPrintCover>
      <View style={{ padding: 14 }}>
        <Text style={{ fontFamily: sansFor(800), fontSize: 15, color: theme.color.ink }} numberOfLines={1}>
          {workshop.title}
        </Text>
        <Text style={{ fontFamily: sansFor(600), fontSize: 12.5, color: theme.color.mist, marginTop: 3 }} numberOfLines={1}>
          {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · {hrs} · {place}
        </Text>
        <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: theme.color.ink, marginTop: 6 }}>
          {price} · <Text style={{ fontFamily: sansFor(600), color: theme.color.mist }}>{workshop.registered_count} of {workshop.capacity} {verb}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export default function WorkshopsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [tab, setTab] = useState<'up' | 'live' | 'past'>('up');
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, refetch } = useStudioWorkshops();

  const now = new Date();
  const all: Workshop[] = data?.items ?? [];
  const items = all.filter((w) => {
    const start = new Date(w.start_at);
    if (tab === 'live') return !!w.live || (w.status === 'upcoming' && start.getTime() - now.getTime() > 0 && start.getTime() - now.getTime() < 60 * 60 * 1000);
    if (tab === 'up') return w.status !== 'completed' && start >= now;
    return start < now && !w.live;
  });

  const onRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  const hero = (
    <View style={styles.hero}>
      <Text style={{ fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1.8, color: theme.color.persimmon }}>EVENTS YOU HOST</Text>
      <Text style={{ fontFamily: theme.font.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, color: theme.color.ink, marginTop: 4 }}>
        Workshops
      </Text>
    </View>
  );

  return (
    <Screen header={hero} bottomTab="workshops" scroll={false}>
      <View style={{ paddingTop: 4, paddingBottom: 14 }}>
        <SegChoice
          items={[
            { key: 'up', label: 'Upcoming' },
            { key: 'live', label: 'Live' },
            { key: 'past', label: 'Past' },
          ]}
          value={tab}
          onChange={(k) => setTab(k as 'up' | 'live' | 'past')}
        />
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <SkeletonLoader height={190} borderRadius={18} />
            <SkeletonLoader height={190} borderRadius={18} />
          </View>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 40, textAlign: 'center' }}>
            {tab === 'up'
              ? 'No upcoming workshops. Create one below.'
              : tab === 'live'
              ? 'No workshops live right now.'
              : 'No past workshops.'}
          </Text>
        ) : (
          items.map((w, i) => (
            <WorkshopCard key={w.id} workshop={w} variant={((i % 4) + 1) as 1 | 2 | 3 | 4} onPress={() => router.push(`/workshops/${w.id}`)} />
          ))
        )}

        <Button variant="primary" block icon={<IconPlus size={18} color="#fff" />} style={{ marginTop: 4 }} onPress={() => router.push('/workshops/new')}>
          Create workshop
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: 'transparent' },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  badge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
