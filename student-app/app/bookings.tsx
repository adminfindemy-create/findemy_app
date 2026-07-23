import { EmptyState } from '@/components/common/EmptyState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useMyEventRegistrations } from '@/hooks/useEvents';
import { useTrialsMy } from '@/hooks/useTrials';
import { useMyWorkshopRegistrations } from '@/hooks/useWorkshops';
import { getEventImage, getWorkshopImage } from '@/lib/eventImages';
import { BlockPrintCover, IconChevR, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function inr(paise?: number | null): string {
  const rupees = Math.round((paise ?? 0) / 100);
  const rupeesStr = String(rupees);
  if (rupeesStr.length <= 3) return `₹${rupeesStr}`;
  const last3 = rupeesStr.slice(-3);
  const rest = rupeesStr.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest},${last3}`;
}

type Row = {
  key: string;
  title: string;
  badge: { label: string; bg: string; fg: string };
  subText: string;
  footLeft: string;
  footRight?: string;
  thumb: 'workshop' | 'event' | { category: string };
  workshopType?: string;
  eventType?: string;
  onPress: () => void;
  sortDate: number;
  past: boolean;
};

export default function BookingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [seg, setSeg] = useState<'upcoming' | 'past'>('upcoming');

  const upcomingTrials = useTrialsMy('upcoming');
  const pastTrials = useTrialsMy('past');
  const workshopRegs = useMyWorkshopRegistrations();
  const eventRegs = useMyEventRegistrations();

  const isLoading =
    upcomingTrials.isLoading ||
    pastTrials.isLoading ||
    workshopRegs.isLoading ||
    eventRegs.isLoading;
  const refreshing =
    upcomingTrials.isRefetching ||
    pastTrials.isRefetching ||
    workshopRegs.isRefetching ||
    eventRegs.isRefetching;
  const onRefresh = () => {
    upcomingTrials.refetch();
    pastTrials.refetch();
    workshopRegs.refetch();
    eventRegs.refetch();
  };

  const jade = { bg: theme.color.jadeSoft, fg: theme.color.jade };
  const neutral = { bg: theme.color.bone, fg: theme.color.inkSoft };
  const rose = { bg: theme.color.roseSoft, fg: theme.color.rose };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const now = Date.now();

    const pushTrial = (trial: any, past: boolean) => {
      const at = trial.scheduled_at ?? trial.trial_at ?? trial.trialAt;
      const when = at ? `${format(new Date(at), 'EEE d MMM · h:mm a')}` : '';
      const trialStatus = (trial.status ?? '').toLowerCase();
      const badge = past
        ? trialStatus === 'missed' || trialStatus === 'cancelled'
          ? { label: trialStatus === 'missed' ? 'Missed' : 'Cancelled', ...rose }
          : { label: 'Attended', ...neutral }
        : { label: 'Booked', ...jade };
      out.push({
        key: `trial-${trial.id}`,
        title: trial.batch_title ?? 'Trial',
        badge,
        subText: when,
        footLeft: trial.academy_name ?? '',
        footRight:
          trial.trial_fee_paise != null
            ? trial.trial_fee_paise === 0
              ? 'Free'
              : inr(trial.trial_fee_paise)
            : undefined,
        thumb: { category: trial.category ?? 'music' },
        onPress: () => router.push(`/trials/${trial.id}` as any),
        sortDate: at ? new Date(at).getTime() : 0,
        past,
      });
    };

    for (const trial of (upcomingTrials.data?.items ?? []) as any[]) pushTrial(trial, false);
    for (const trial of (pastTrials.data?.items ?? []) as any[]) pushTrial(trial, true);

    for (const workshop of (workshopRegs.data?.items ?? []) as any[]) {
      const at = workshop.start_at ? new Date(workshop.start_at).getTime() : 0;
      const past = at ? at < now : false;
      const online = (workshop.workshop_type ?? '') === 'online';
      out.push({
        key: `workshop-${workshop.id}`,
        title: workshop.workshop_title ?? 'Workshop',
        badge: online
          ? { label: 'Online', ...jade }
          : { label: 'Workshop', bg: theme.color.marigoldSoft, fg: theme.color.marigold },
        subText: workshop.start_at ? format(new Date(workshop.start_at), 'd MMM · h:mm a') : '',
        footLeft: workshop.academy_name ? `By ${workshop.academy_name}` : '',
        footRight: workshop.price_paise > 0 ? inr(workshop.price_paise) : 'Free',
        thumb: 'workshop',
        workshopType: workshop.workshop_type,
        onPress: () => router.push(`/workshop/${workshop.workshop_id}` as any),
        sortDate: at,
        past,
      });
    }

    for (const event of (eventRegs.data?.items ?? []) as any[]) {
      const at = event.start_at ? new Date(event.start_at).getTime() : 0;
      const past = at ? at < now : false;
      out.push({
        key: `event-${event.id}`,
        title: event.event_title ?? 'Event',
        badge: { label: 'Event', ...jade },
        subText: event.start_at ? format(new Date(event.start_at), 'd MMM · h:mm a') : '',
        footLeft: event.organizer_name ? `By ${event.organizer_name}` : (event.location ?? ''),
        footRight: event.price_paise > 0 ? inr(event.price_paise) : 'Free',
        thumb: 'event',
        eventType: event.event_type,
        onPress: () => router.push(`/events/${event.event_id}` as any),
        sortDate: at,
        past,
      });
    }

    return out.sort((rowA, rowB) => rowB.sortDate - rowA.sortDate);
  }, [upcomingTrials.data, pastTrials.data, workshopRegs.data, eventRegs.data, theme]);

  const shown = rows.filter((row) => (seg === 'past' ? row.past : !row.past));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="Your bookings" />

      <View style={[styles.seg, { backgroundColor: theme.color.paperWarm }]}>
        {(['upcoming', 'past'] as const).map((segment) => {
          const active = seg === segment;
          return (
            <Pressable
              key={segment}
              onPress={() => setSeg(segment)}
              style={[styles.segBtn, active && { backgroundColor: '#fff', ...theme.shadow.sm }]}
            >
              <Text
                style={{
                  fontFamily: theme.font.sansBold,
                  fontSize: 13.5,
                  color: active ? theme.color.ink : theme.color.inkSoft,
                }}
              >
                {segment === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[0, 1, 2].map((index) => (
            <SkeletonLoader key={index} height={90} borderRadius={20} />
          ))}
        </View>
      ) : shown.length === 0 ? (
        <EmptyState
          message={
            seg === 'past'
              ? 'No past bookings yet.'
              : 'No upcoming bookings. Book a trial or register for a workshop.'
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.color.persimmon}
            />
          }
        >
          {shown.map((row) => (
            <Pressable
              key={row.key}
              onPress={row.onPress}
              style={[
                styles.card,
                { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
              ]}
            >
              {row.thumb === 'workshop' ? (
                <Image
                  source={{ uri: getWorkshopImage(row.workshopType) }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={150}
                />
              ) : row.thumb === 'event' ? (
                <Image
                  source={{ uri: getEventImage(row.eventType) }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <BlockPrintCover
                  category={row.thumb.category as any}
                  variant={1}
                  height={66}
                  hideLetter
                  style={styles.thumb}
                />
              )}
              <View style={styles.body}>
                <Text
                  style={[styles.ttl, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}
                  numberOfLines={1}
                >
                  {row.title}
                </Text>
                <View style={styles.subRow}>
                  <View style={[styles.badge, { backgroundColor: row.badge.bg }]}>
                    <Text style={[styles.badgeText, { color: row.badge.fg }]}>
                      {row.badge.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.sub,
                      { fontFamily: theme.font.sansMedium, color: theme.color.mist },
                    ]}
                    numberOfLines={1}
                  >
                    {row.subText}
                  </Text>
                </View>
                <View style={styles.foot}>
                  <Text
                    style={[
                      styles.footText,
                      { fontFamily: theme.font.sansMedium, color: theme.color.mist },
                    ]}
                    numberOfLines={1}
                  >
                    {row.footLeft}
                  </Text>
                  {row.footRight ? (
                    <Text
                      style={{
                        fontFamily: theme.font.sansBold,
                        fontSize: 14,
                        color: theme.color.ink,
                      }}
                    >
                      {row.footRight}
                    </Text>
                  ) : null}
                  <IconChevR size={18} color={theme.color.whisper} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    padding: 5,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 66, height: 66, borderRadius: 15, overflow: 'hidden' },
  body: { flex: 1, minWidth: 0 },
  ttl: { fontSize: 16, letterSpacing: -0.1, lineHeight: 18 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  sub: { fontSize: 12.5, flexShrink: 1 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  footText: { fontSize: 12.5, flex: 1 },
});
