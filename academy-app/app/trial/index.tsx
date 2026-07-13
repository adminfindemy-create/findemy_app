import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme, sansFor, Spill, IconChevR } from '@findemy/ui';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useStudioInbox } from '@/hooks/useStudioQueries';
import { format } from 'date-fns';

function fmtAmount(paise: number): string {
  const amount = Math.round(paise / 100);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function TrialsListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: inboxData, isLoading, refetch } = useStudioInbox({ status: 'new', refetchInterval: 30_000 });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Client-side "See more": reveal 5 at a time over the already-fetched list.
  const PAGE = 5;
  const [trialLimit, setTrialLimit] = React.useState(PAGE);

  const allTrials = ((inboxData as any)?.items ?? []) as any[];
  const trialItems = allTrials.slice(0, trialLimit);
  const newCount = allTrials.length;

  return (
    <Screen
      header={
        <ScreenHeader
          title="New trial bookings"
          showBack
          rightAction={
            newCount > 0 ? (
              <View style={[styles.newBadge, { backgroundColor: theme.color.roseSoft }]}>
                <Text style={{ fontFamily: sansFor(700), fontSize: 11, color: theme.color.rose }}>
                  {newCount}
                </Text>
              </View>
            ) : undefined
          }
        />
      }
      bottomTab={null}
      scroll
    >
      {isLoading ? (
        <View style={{ gap: 10, paddingTop: 6 }}>
          <SkeletonLoader height={72} borderRadius={16} />
          <SkeletonLoader height={72} borderRadius={16} />
        </View>
      ) : trialItems.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
            No new trial requests right now.
          </Text>
        </View>
      ) : (
        trialItems.map((trial: any) => {
          const when = trial.scheduled_at ? new Date(trial.scheduled_at) : null;
          const whenValid = when && !isNaN(when.getTime());
          const sub = [
            whenValid ? format(when!, 'EEE d MMM · h:mm a') : null,
            trial.coach_name,
            trial.trial_fee_paise != null ? fmtAmount(trial.trial_fee_paise) : null,
          ].filter(Boolean).join(' · ');
          return (
            <Pressable
              key={trial.id}
              style={[styles.rowCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
              onPress={() => router.push(`/trial/${trial.id}` as any)}
            >
              <View style={[styles.av, { backgroundColor: theme.color.jade }]}>
                <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 15, color: theme.color.ivory }}>
                  {trial.student_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: sansFor(700), fontSize: 14.5, color: theme.color.ink }} numberOfLines={1}>
                    {trial.batch_title ?? 'Trial'}
                  </Text>
                  <Spill state={trial.status ?? 'pending'} />
                </View>
                {sub ? (
                  <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, marginTop: 3 }} numberOfLines={1}>
                    {sub}
                  </Text>
                ) : null}
              </View>
              <IconChevR size={18} color={theme.color.whisper} />
            </Pressable>
          );
        })
      )}
      {allTrials.length > trialLimit ? (
        <Pressable
          style={[styles.seeMore, { borderColor: theme.color.hairline }]}
          onPress={() => setTrialLimit((prev) => prev + PAGE)}
        >
          <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: theme.color.ink }}>
            {`See ${Math.min(PAGE, allTrials.length - trialLimit)} more`}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  av: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
});
