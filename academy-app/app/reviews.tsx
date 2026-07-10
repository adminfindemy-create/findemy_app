import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme, sansFor, StarRating } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ErrorState } from '@/components/ErrorState';
import { useStudioReviews, useStudioReviewsSummary } from '@/hooks/useStudioQueries';
import type { Review } from '@findemy/types';

type Filter = 'all' | 'needs_reply' | 'replied' | '5' | 'lte3';

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Stars({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.color.marigold, fontSize: 12 }}>
      {'★'.repeat(Math.round(value))}
      {'☆'.repeat(5 - Math.round(value))}
    </Text>
  );
}

export default function ReviewsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, isError, refetch } = useStudioReviews(filter);
  const { data: summaryData } = useStudioReviewsSummary();

  const summary = summaryData ?? data?.summary;
  const needsReply = summaryData?.needs_reply ?? data?.summary?.needs_reply ?? 0;
  const items = data?.items ?? [];

  const tabs: { key: Filter; label: string; alert?: boolean }[] = [
    { key: 'all', label: 'All' },
    { key: 'needs_reply', label: `Needs reply${needsReply ? ` · ${needsReply}` : ''}`, alert: !!needsReply },
    { key: 'replied', label: 'Replied' },
    { key: '5', label: '5★' },
    { key: 'lte3', label: '≤3★' },
  ];

  return (
    <Screen header={<ScreenHeader title="Reviews" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {/* Summary card (.revsum) */}
        {summary ? (
          <View style={[styles.summary, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
            <View style={{ alignItems: 'center', paddingRight: 16 }}>
              <Text style={{ fontFamily: theme.font.serif, fontSize: 44, color: theme.color.ink, lineHeight: 46 }}>
                {summary.average.toFixed(1)}
              </Text>
              <StarRating value={Math.round(summary.average)} />
              <Text style={{ fontFamily: sansFor(600), fontSize: 11, color: theme.color.mist, marginTop: 4 }}>
                {summary.count} reviews
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const countForStar = summary.breakdown[star as 1 | 2 | 3 | 4 | 5] ?? 0;
                const pct = summary.count ? (countForStar / summary.count) * 100 : 0;
                return (
                  <View key={star} style={styles.barRow}>
                    <Text style={{ fontFamily: sansFor(600), fontSize: 11, color: theme.color.mist, width: 10 }}>{star}</Text>
                    <View style={[styles.bar, { backgroundColor: theme.color.paperWarm }]}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: theme.color.marigold, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Filter pills (.pills) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsWrap} contentContainerStyle={styles.pills}>
          {tabs.map((tab) => {
            const on = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                style={[
                  styles.pill,
                  { backgroundColor: on ? theme.color.ink : theme.color.ivory, borderColor: on ? theme.color.ink : theme.color.hairline },
                  !on && theme.shadow.sm,
                ]}
              >
                <Text
                  style={{
                    fontFamily: sansFor(600),
                    fontSize: 13,
                    color: on ? theme.color.ivory : tab.alert ? theme.color.rose : theme.color.inkSoft,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={{ gap: 10 }}>
            <SkeletonLoader height={110} borderRadius={16} />
            <SkeletonLoader height={110} borderRadius={16} />
          </View>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, paddingVertical: 24 }}>
            No reviews here yet.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((review: Review) => {
              const flagged = review.flagged;
              return (
                <View
                  key={review.id}
                  style={[
                    styles.card,
                    { backgroundColor: flagged ? theme.color.roseSoft : theme.color.ivory, borderColor: flagged ? theme.color.roseSoft : theme.color.hairline },
                    !flagged && theme.shadow.sm,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                    <View style={[styles.av, { backgroundColor: flagged ? theme.color.rose : theme.color.persimmon }]}>
                      <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 16, color: theme.color.ivory }}>
                        {review.student_name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>{review.student_name}</Text>
                        <Stars value={review.rating} />
                      </View>
                      <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: theme.color.mist, marginTop: 1 }}>
                        {[review.batch_title, review.session_count ? `${review.session_count} sessions` : null, fmtDate(review.created_at)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </View>

                  {review.comment ? (
                    <Text style={{ fontFamily: theme.font.sans, fontSize: 13.5, color: theme.color.ink, marginTop: 10, lineHeight: 20 }}>
                      “{review.comment}”
                    </Text>
                  ) : null}

                  {review.response ? (
                    <View style={[styles.policy, { backgroundColor: theme.color.jadeSoft }]}>
                      <Text style={{ fontFamily: sansFor(800), fontSize: 10.5, color: theme.color.jade, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
                        Your reply{review.responded_at ? ` · ${fmtDate(review.responded_at)}` : ''}
                      </Text>
                      <Text style={{ fontFamily: sansFor(500), fontSize: 13, color: theme.color.jade, lineHeight: 18 }}>
                        {review.response}
                      </Text>
                    </View>
                  ) : flagged ? (
                    <Pressable
                      onPress={() => router.push(`/reviews/${review.id}/respond`)}
                      style={[styles.darkBtn, { backgroundColor: theme.color.ink }]}
                    >
                      <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ivory }}>
                        Respond now — protect your rating
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => router.push(`/reviews/${review.id}/respond`)}
                      style={[styles.replyPill, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
                    >
                      <Text style={{ fontFamily: sansFor(700), fontSize: 12.5, color: theme.color.ink }}>Reply</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  pillsWrap: { marginHorizontal: -16 },
  pills: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 2 },
  pill: { borderRadius: 999, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 17 },
  card: { borderRadius: 18, borderWidth: 1, padding: 15 },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  policy: { borderRadius: 14, padding: 12, marginTop: 12 },
  darkBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  replyPill: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 18, marginTop: 10 },
});
