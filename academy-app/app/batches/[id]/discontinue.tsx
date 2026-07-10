import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useTheme, sansFor, Button } from '@findemy/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { ErrorState } from '@/components/ErrorState';
import { useBatchDiscontinuation, useDiscontinueBatch, useFinishDiscontinuation, useRefundBlocker } from '@/hooks/useStudioQueries';

function inr(paise?: number): string {
  return `₹${Math.round((paise ?? 0) / 100).toLocaleString('en-IN')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DiscontinueBatchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useBatchDiscontinuation(id);
  const discontinue = useDiscontinueBatch(id);
  const finish = useFinishDiscontinuation(id);
  const refundBlocker = useRefundBlocker(id);

  const onRefund = (b: { enrollment_id: string; student_name: string | null; amount_paise: number }) => {
    Alert.alert(
      'Refund & release?',
      `Refund the unused part of ${b.student_name ?? 'this student'}'s paid term and remove them from the batch. This is issued immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await refundBlocker.mutateAsync(b.enrollment_id);
              showToast(`Refunded ${inr((res as any)?.refund_amount_paise)}`, 'success');
              refetch();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to refund');
            }
          },
        },
      ],
    );
  };

  const status = data?.status;

  const onDiscontinue = () => {
    Alert.alert(
      'Discontinue batch?',
      'New trials, enrolments and renewals stop immediately. Enrolled students keep attending until the term they’ve paid for ends. You must give at least 30 days’ notice.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discontinue',
          style: 'destructive',
          onPress: async () => {
            try {
              await discontinue.mutateAsync();
              showToast('Batch discontinuation started', 'success');
              refetch();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to discontinue batch');
            }
          },
        },
      ],
    );
  };

  const onFinish = async () => {
    try {
      await finish.mutateAsync();
      showToast('Batch discontinued', 'success');
      router.back();
    } catch (e: any) {
      Alert.alert('Cannot finish yet', e.message || 'Some obligations are still open');
    }
  };

  const fgh = {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: theme.color.whisper,
  };

  return (
    <Screen header={<ScreenHeader title="Discontinue batch" showBack />} bottomTab={null} scroll>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {isLoading ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        ) : isError || !data ? (
          <ErrorState message="Couldn't load this batch." onRetry={refetch} />
        ) : status === 'active' || status === 'inactive' ? (
          // Not yet discontinuing — offer to start.
          <>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 24, lineHeight: 28, color: theme.color.ink }}>
              {data.batch_title}
            </Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 21, color: theme.color.inkSoft, marginTop: 12 }}>
              Discontinuing removes this batch from discovery and stops all new trials, enrolments and
              renewals immediately. Currently enrolled students keep attending until the term they’ve
              paid for ends (or you refund them). A minimum 30-day notice applies.
            </Text>
            <Button variant="primary" block style={{ marginTop: 24 }} loading={discontinue.isPending} onPress={onDiscontinue}>
              Discontinue this batch
            </Button>
          </>
        ) : status === 'ended' ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink }}>Discontinued</Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, marginTop: 8, textAlign: 'center' }}>
              This batch has been fully discontinued.
            </Text>
          </View>
        ) : (
          // status === 'closing'
          <>
            {/* Notice banner */}
            <View style={[styles.banner, { backgroundColor: theme.color.roseSoft }]}>
              <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.rose }}>Discontinuation in progress</Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.rose, marginTop: 4, lineHeight: 18 }}>
                New bookings are stopped. {data.notice_days_remaining > 0
                  ? `${data.notice_days_remaining} day${data.notice_days_remaining === 1 ? '' : 's'} of the 30-day notice remaining.`
                  : 'Notice period met.'}
              </Text>
            </View>

            {/* Blocking roster */}
            <Text style={[fgh, { marginTop: 22, marginBottom: 10 }]}>
              Students still on a paid term ({data.blockers.length})
            </Text>
            {data.blockers.length === 0 ? (
              <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
                  No students have a remaining paid term — you can finish the discontinuation.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {data.blockers.map((b) => (
                  <View key={b.enrollment_id} style={[styles.rowCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }} numberOfLines={1}>
                        {b.student_name ?? 'Student'}
                      </Text>
                      <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, marginTop: 3 }}>
                        Serving out until {fmtDate(b.paid_through)} · {b.package_type}
                      </Text>
                    </View>
                    {/* Refund accelerator — pro-rated to the unused term. */}
                    <Pressable
                      onPress={() => onRefund(b)}
                      disabled={refundBlocker.isPending}
                      style={[styles.pill, { backgroundColor: theme.color.roseSoft, borderColor: theme.color.roseSoft, opacity: refundBlocker.isPending ? 0.5 : 1 }]}
                    >
                      <Text style={{ fontFamily: sansFor(700), fontSize: 11.5, color: theme.color.rose }}>Refund</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Button
              variant="primary"
              block
              style={{ marginTop: 20, opacity: data.can_finish ? 1 : 0.5 }}
              disabled={!data.can_finish}
              loading={finish.isPending}
              onPress={onFinish}
            >
              Finish discontinuation
            </Button>
            {!data.can_finish ? (
              <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, textAlign: 'center', marginTop: 8, lineHeight: 16 }}>
                {data.blockers.length > 0
                  ? 'Serve out or refund the students above, and complete the 30-day notice, before finishing.'
                  : 'Complete the 30-day notice period before finishing.'}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 14, padding: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
});
