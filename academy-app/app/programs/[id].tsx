import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ScrollView, FlatList, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  useTheme,
  sansFor,
  BlockPrintCover,
  IconChevL,
  IconEdit,
  IconClock,
  IconUser,
  IconPlus,
} from '@findemy/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useToast } from '@/components/common/Toast';
import { useStudioProgram, useDeleteProgram } from '@/hooks/useStudioQueries';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CATS = ['music', 'dance', 'arts', 'yoga'] as const;
const COVER_H = 300;

function inr(paise?: number | null): string {
  return `₹${Math.round(Number(paise ?? 0) / 100).toLocaleString('en-IN')}`;
}

function fmtSchedule(timings: any[]): { days: string; time: string } {
  if (!timings?.length) return { days: '', time: '' };
  const days = [...new Set(timings.map((timing) => timing.day_of_week))].sort().map((dayNum) => DAY_LETTER[dayNum]).join(' · ');
  const firstTiming = timings[0];
  let time = '';
  if (firstTiming?.start_time) {
    const [h, m] = String(firstTiming.start_time).split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    time = `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return { days, time };
}

// Full-bleed media carousel (photos + video tiles). Videos open in the system player.
function MediaCarousel({ media, width, cat }: { media: any[]; width: number; cat: string }) {
  const [idx, setIdx] = useState(0);
  return (
    <View style={{ height: COVER_H, backgroundColor: '#000' }}>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(event) => setIdx(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) =>
          item.type === 'photo' ? (
            <Image source={{ uri: item.url }} style={{ width, height: COVER_H }} contentFit="cover" />
          ) : (
            <Pressable onPress={() => Linking.openURL(item.url)} style={{ width, height: COVER_H, alignItems: 'center', justifyContent: 'center' }}>
              <View style={styles.playCircle}>
                <Text style={{ color: '#fff', fontSize: 26, marginLeft: 3 }}>▶</Text>
              </View>
              <Text style={{ fontFamily: sansFor(700), fontSize: 12, letterSpacing: 0.6, color: 'rgba(255,255,255,0.85)', marginTop: 12 }}>Tap to play video</Text>
            </Pressable>
          )
        }
      />
      {media.length > 1 ? (
        <View style={styles.dots}>
          {media.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.45)', width: i === idx ? 18 : 6 }]} />
          ))}
        </View>
      ) : null}
      <View style={[styles.scrim, { height: 90 }]} pointerEvents="none" />
    </View>
  );
}

export default function ProgramDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { show: showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useStudioProgram(id);
  const deleteProgram = useDeleteProgram();

  const program = data?.program;
  const batches: any[] = data?.batches ?? [];
  const media: any[] = program?.media ?? [];
  const canDelete = batches.length === 0;

  const cat = (CATS.includes((program?.category ?? '') as any) ? program!.category : 'music') as
    'music' | 'dance' | 'arts' | 'yoga';
  const pal = theme.category[cat];

  const totalEnrolled = batches.reduce(
    (sum, batch) => sum + (batch.capacity != null && batch.trial_spots != null ? Math.max(0, batch.capacity - batch.trial_spots) : 0),
    0,
  );
  const totalSpots = batches.reduce((sum, batch) => sum + (batch.trial_spots ?? 0), 0);

  const onDelete = () => {
    Alert.alert(
      'Delete program?',
      'This removes the program. You can only delete a program with no batches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProgram.mutateAsync(id);
              showToast('Program deleted', 'success');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete program');
            }
          },
        },
      ],
    );
  };

  const kicker = { fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const };
  const metaText = { fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist };

  const CircleBtn = ({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) => (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.circleBtn}>
      {children}
    </Pressable>
  );

  // ── Loading / error ──
  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.color.paperWarm, paddingTop: insets.top + 12 }]}>
        <View style={{ paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.circleBtn, { backgroundColor: theme.color.paperWarm }]}>
            <IconChevL size={20} color={theme.color.ink} />
          </Pressable>
          <View style={{ gap: 12, marginTop: 20 }}>
            <SkeletonLoader height={COVER_H - 60} borderRadius={18} />
            <SkeletonLoader height={30} width="55%" borderRadius={8} />
            <SkeletonLoader height={72} borderRadius={18} />
          </View>
        </View>
      </View>
    );
  }

  if (isError || !program) {
    return (
      <View style={[styles.root, { backgroundColor: theme.color.paperWarm, paddingTop: insets.top + 12 }]}>
        <View style={{ paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.circleBtn, { backgroundColor: theme.color.paperWarm }]}>
            <IconChevL size={20} color={theme.color.ink} />
          </Pressable>
        </View>
        <ErrorState message="Couldn't load this program." onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.color.paperWarm }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        {/* ── Cover: media carousel, or category-art fallback ── */}
        <View>
          {media.length > 0 ? (
            <MediaCarousel media={media} width={width} cat={cat} />
          ) : (
            <BlockPrintCover category={cat} variant={2} letter={program.title?.[0]} height={COVER_H} />
          )}
          {/* Floating controls */}
          <View style={[styles.floatBar, { top: insets.top + 8 }]}>
            <CircleBtn onPress={() => router.back()} label="Go back"><IconChevL size={20} color="#fff" /></CircleBtn>
            <CircleBtn onPress={() => router.push(`/programs/${id}/edit` as never)} label="Edit program"><IconEdit size={18} color="#fff" /></CircleBtn>
          </View>
        </View>

        {/* ── Title block ── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
          <Text style={[kicker, { color: pal.accent, marginBottom: 6 }]}>{cat}</Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 32, lineHeight: 36, letterSpacing: -0.4, color: theme.color.ink }}>
            {program.title}
          </Text>

          {/* Stats strip */}
          <View style={styles.stats}>
            {[
              { v: String(batches.length), t: 'Batches' },
              { v: String(totalEnrolled), t: 'Students' },
              { v: String(totalSpots), t: 'Open spots' },
            ].map((stat) => (
              <View key={stat.t} style={[styles.stat, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                <Text style={{ fontFamily: theme.font.serif, fontSize: 22, lineHeight: 24, color: theme.color.ink }}>{stat.v}</Text>
                <Text style={[kicker, { fontSize: 9.5, color: theme.color.whisper, marginTop: 3 }]}>{stat.t}</Text>
              </View>
            ))}
          </View>

          {/* About */}
          {program.description ? (
            <View style={{ marginTop: 24 }}>
              <Text style={[kicker, { color: theme.color.whisper, marginBottom: 8 }]}>About</Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 14.5, lineHeight: 23, color: theme.color.inkSoft }}>
                {program.description}
              </Text>
            </View>
          ) : null}

          {/* Things to know */}
          {program.things_to_know?.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[kicker, { color: theme.color.whisper, marginBottom: 10 }]}>Things to know</Text>
              <View style={[styles.knowCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                {program.things_to_know.map((note: string, index: number) => (
                  <View key={index} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: index === 0 ? 0 : 10 }}>
                    <View style={[styles.bullet, { backgroundColor: pal.accent }]} />
                    <Text style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 20, color: theme.color.inkSoft }}>{note}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Batches */}
          <View style={styles.secRow}>
            <Text style={{ fontFamily: sansFor(800), fontSize: 19, letterSpacing: -0.4, color: theme.color.ink }}>Batches</Text>
            <View style={[styles.countChip, { backgroundColor: pal.base }]}>
              <Text style={{ fontFamily: sansFor(700), fontSize: 12, color: pal.accent }}>{batches.length}</Text>
            </View>
          </View>

          {batches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
              <View style={[styles.emptyIcon, { backgroundColor: pal.base }]}>
                <IconPlus size={22} color={pal.accent} />
              </View>
              <Text style={{ fontFamily: sansFor(700), fontSize: 14.5, color: theme.color.ink, marginTop: 12 }}>No batches yet</Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 12.5, color: theme.color.mist, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                Add your first batch — schedule, coach, capacity and fees.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {batches.map((batch) => {
                const { days, time } = fmtSchedule(batch.timings ?? []);
                const online = batch.mode === 'online';
                const closing = batch.status === 'closing';
                const ended = batch.status === 'ended';
                const enrolled = batch.capacity != null && batch.trial_spots != null ? Math.max(0, batch.capacity - batch.trial_spots) : null;
                const pct = enrolled != null && batch.capacity ? Math.min(1, enrolled / batch.capacity) : 0;
                return (
                  <Pressable
                    key={batch.id}
                    onPress={() => router.push(`/batches/${batch.id}`)}
                    style={[styles.batchCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, opacity: ended ? 0.6 : 1 }, theme.shadow.sm]}
                  >
                    <View style={styles.batchHead}>
                      <Text style={{ fontFamily: sansFor(800), fontSize: 15.5, color: theme.color.ink, flexShrink: 1 }} numberOfLines={1}>
                        {batch.level || 'Batch'}
                      </Text>
                      {closing || ended ? (
                        <View style={[styles.pill, { backgroundColor: theme.color.roseSoft }]}>
                          <Text style={{ fontFamily: sansFor(700), fontSize: 10, color: theme.color.rose }}>{ended ? 'Ended' : 'Closing'}</Text>
                        </View>
                      ) : (
                        <View style={[styles.pill, { backgroundColor: online ? theme.color.jadeSoft : theme.color.marigoldSoft }]}>
                          <Text style={{ fontFamily: sansFor(700), fontSize: 10, color: online ? theme.color.jade : theme.color.marigold }}>
                            {online ? 'Online' : 'In-studio'}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }}>{inr(batch.monthly_fee_paise)}<Text style={{ fontFamily: sansFor(500), fontSize: 11, color: theme.color.mist }}>/mo</Text></Text>
                    </View>

                    <View style={{ gap: 6, marginTop: 10 }}>
                      {(days || time) ? (
                        <View style={styles.metaRow}>
                          <IconClock size={14} color={theme.color.whisper} />
                          <Text style={metaText}>{[days, time].filter(Boolean).join('  ·  ')}</Text>
                        </View>
                      ) : null}
                      {batch.coach_name ? (
                        <View style={styles.metaRow}>
                          <IconUser size={14} color={theme.color.whisper} />
                          <Text style={metaText}>{batch.coach_name}</Text>
                        </View>
                      ) : null}
                    </View>

                    {enrolled != null ? (
                      <View style={{ marginTop: 12 }}>
                        <View style={[styles.track, { backgroundColor: theme.color.hairline }]}>
                          <View style={[styles.fill, { backgroundColor: pal.accent, width: `${Math.round(pct * 100)}%` }]} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                          <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: theme.color.mist }}>{enrolled}/{batch.capacity} enrolled</Text>
                          <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: pal.accent }}>{batch.trial_spots} spot{batch.trial_spots === 1 ? '' : 's'} open</Text>
                        </View>
                      </View>
                    ) : null}

                    <Text style={{ fontFamily: sansFor(600), fontSize: 11, color: theme.color.whisper, marginTop: 10 }}>Tap to manage & edit →</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Add batch */}
          <Pressable onPress={() => router.push(`/batches/new?program_id=${id}` as never)} style={[styles.addTile, { borderColor: pal.accent }]}>
            <IconPlus size={18} color={pal.accent} />
            <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: pal.accent }}>Add a batch</Text>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={canDelete ? onDelete : undefined} style={{ marginTop: 24, alignItems: 'center', opacity: canDelete ? 1 : 0.4 }} disabled={!canDelete}>
            <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: theme.color.rose }}>Delete program</Text>
          </Pressable>
          {!canDelete ? (
            <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, textAlign: 'center', marginTop: 5, lineHeight: 16 }}>
              Remove all batches before deleting this program.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  circleBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  floatBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  dots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { height: 6, borderRadius: 3 },

  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },

  secRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26, marginBottom: 14 },
  countChip: { minWidth: 26, height: 24, paddingHorizontal: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  knowCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },

  emptyCard: { borderRadius: 20, borderWidth: 1, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },

  batchCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  batchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 999 },
  playCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },

  addTile: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 15,
  },
});
