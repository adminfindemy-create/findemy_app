import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme, sansFor, IconCal, IconUser, IconChevR } from '@findemy/ui';
import { useAuth } from '@/stores/auth';
import { useStudioDashboard, useStudioSchedule, useStudioActivity } from '@/hooks/useStudioQueries';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInbox } from '@/stores/inbox';
import { format, startOfWeek } from 'date-fns';
import { ActivityRow } from '@/components/ActivityRow';

function fmtAmount(paise: number): string {
  const amount = Math.round(paise / 100);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function InboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const academy = useAuth((s) => s.academy);
  const resetNew = useInbox((s) => s.resetNew);
  const setLastSeen = useInbox((s) => s.setLastSeen);

  const { data: dashboard, refetch: refetchDash } = useStudioDashboard();
  const { data: activityData, refetch: refetchActivity } = useStudioActivity();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: schedData } = useStudioSchedule({ week_start: weekStart });

  useFocusEffect(
    React.useCallback(() => {
      resetNew();
      refetchDash();
      refetchActivity();
    }, [resetNew, refetchDash, refetchActivity])
  );

  // Record the count the coach has now seen as the baseline for "new since".
  React.useEffect(() => {
    const seen = (dashboard as Record<string, any> | undefined)?.inbox_counts?.new;
    if (typeof seen === 'number') setLastSeen(seen);
  }, [dashboard, setLastSeen]);

  // Client-side "See more": reveal 5 at a time over the already-fetched list.
  const PAGE = 5;
  const [activityLimit, setActivityLimit] = React.useState(PAGE);

  const dash = dashboard as Record<string, any> | undefined;
  const allActivity = activityData?.items ?? [];
  const activityItems = allActivity.slice(0, activityLimit);
  const todaySchedule =
    ((schedData as any)?.days ?? []).find((day: any) => day.date === todayStr)?.items ?? [];

  const dateLabel = format(new Date(), 'EEE d MMM');
  const newCount = dash?.inbox_counts?.new ?? 0;
  const studentsCount = dash?.students_count ?? 0;
  const thisMonth = dash?.earnings_summary?.this_month_paise ?? 0;
  const lastMonth = dash?.earnings_summary?.last_month_paise ?? 0;
  const earnDelta = thisMonth - lastMonth;
  const classesToday = todaySchedule.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1.8, color: theme.color.persimmon }}>
              MANAGEMENT
            </Text>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, color: theme.color.ink, marginTop: 4 }}>
              Studio Dashboard
            </Text>
          </View>
          <Pressable
            style={[styles.bell, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
            onPress={() => router.push('/(tabs)/studio' as never)}
            accessibilityRole="button"
            accessibilityLabel="My profile"
          >
            <IconUser size={18} color={theme.color.ink} />
          </Pressable>
        </View>

        {/* Dark summary card — each stat taps through to its own screen */}
        <View style={[styles.dash, { backgroundColor: theme.color.ink }, theme.shadow.md]}>
          <View style={styles.dashGlow} />
          <View style={styles.dcal}>
            <IconCal size={22} color={theme.color.persimmon} />
          </View>
          <Text style={styles.dk}>{`Today · ${dateLabel}`}</Text>
          <Text style={[styles.dn, { fontFamily: theme.font.serif }]}>{classesToday}</Text>
          <Text style={styles.dl}>{classesToday === 1 ? 'class active today' : 'classes active today'}</Text>

          <View style={styles.drow}>
            <Pressable
              style={styles.dstat}
              onPress={() => router.push('/trial' as never)}
              accessibilityRole="button"
              accessibilityLabel="View new trial bookings"
            >
              <Text style={[styles.dv, { fontFamily: theme.font.serif }]}>{newCount}</Text>
              <Text style={styles.dt}>New trials</Text>
            </Pressable>
            <Pressable
              style={styles.dstat}
              onPress={() => router.push('/(tabs)/students' as never)}
              accessibilityRole="button"
              accessibilityLabel="View students"
            >
              <Text style={[styles.dv, { fontFamily: theme.font.serif }]}>{studentsCount}</Text>
              <Text style={styles.dt}>Students</Text>
            </Pressable>
            <Pressable
              style={styles.dstat}
              onPress={() => router.push('/earnings' as never)}
              accessibilityRole="button"
              accessibilityLabel="View this month's earnings"
            >
              <Text style={[styles.dv, { fontFamily: theme.font.serif }]}>
                {thisMonth ? fmtAmount(thisMonth) : '₹0'}
                {earnDelta !== 0 ? (
                  <Text style={{ fontFamily: sansFor(700), fontSize: 12, color: earnDelta > 0 ? '#7BD0A0' : theme.color.roseSoft }}>
                    {earnDelta > 0 ? ' ▲' : ' ▼'}
                  </Text>
                ) : null}
              </Text>
              <Text style={styles.dt}>This month</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent activity */}
        <View style={[styles.secRow, { marginTop: 4 }]}>
          <Text style={{ fontFamily: sansFor(800), fontSize: 20, letterSpacing: -0.4, color: theme.color.ink }}>
            Recent activity
          </Text>
        </View>
        {activityItems.length > 0 ? (
          <View style={[styles.activityList, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            {activityItems.map((activityItem, index) => (
              <ActivityRow key={activityItem.id} item={activityItem} isLast={index === activityItems.length - 1} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
              No recent activity yet. Trials, reviews and enrolments will show up here.
            </Text>
          </View>
        )}
        {allActivity.length > activityLimit ? (
          <Pressable
            style={[styles.seeMore, { borderColor: theme.color.hairline }]}
            onPress={() => setActivityLimit((prev) => prev + PAGE)}
          >
            <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: theme.color.ink }}>
              {`See ${Math.min(PAGE, allActivity.length - activityLimit)} more`}
            </Text>
          </Pressable>
        ) : null}

        {/* Earnings mini */}
        {dash?.earnings_summary && (
          <Pressable
            style={[styles.earningsMini, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
            onPress={() => router.push('/earnings')}
          >
            <View style={[styles.earningsIcon, { backgroundColor: theme.color.ink }]}>
              <Text style={{ fontFamily: theme.font.serif, fontSize: 18, color: theme.color.ivory }}>₹</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>
                This month's earnings
              </Text>
              <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, marginTop: 3 }}>
                {fmtAmount(thisMonth)} captured
                {earnDelta !== 0 ? (
                  <Text style={{ fontFamily: sansFor(700), color: earnDelta > 0 ? theme.color.jade : theme.color.rose }}>
                    {`  ${earnDelta > 0 ? '▲' : '▼'} ${fmtAmount(Math.abs(earnDelta))} vs last`}
                  </Text>
                ) : null}
              </Text>
            </View>
            <IconChevR size={18} color={theme.color.whisper} />
          </Pressable>
        )}
      </ScrollView>
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
    paddingBottom: 16,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dash: {
    marginHorizontal: 22,
    marginBottom: 18,
    borderRadius: 22,
    padding: 18,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  dashGlow: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(236,90,43,0.28)',
  },
  dcal: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dk: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  dn: {
    fontSize: 40,
    lineHeight: 44,
    color: '#FFFFFF',
    marginTop: 2,
  },
  dl: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  drow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  dv: {
    fontSize: 19,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  dt: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  dstat: {
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: 22,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  activityList: {
    marginHorizontal: 22,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  seeMore: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  earningsMini: {
    marginHorizontal: 22,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  earningsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
