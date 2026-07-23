import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useToast } from '@/components/common/Toast';
// S0.2: trial-availability publishing + class reschedule removed (Schedule is cancel-only).
import { useCancelSession, useStudioInbox, useStudioSchedule } from '@/hooks/useStudioQueries';
import { istDateKey } from '@/lib/ist';
import { Button, IconChevL, IconChevR, IconX, sansFor, useTheme } from '@findemy/ui';
import { addDays, format, isToday, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Plum/olive/teal have no theme tokens — kept as local consts. `arts` maps to
// theme.color.persimmon (resolved at the use site, where theme is in scope).
const CATEGORY_COLORS: Record<string, string> = {
  music: '#5C2A4A',
  dance: '#1E5C5A',
  yoga: '#8A8A33',
};

// Prototype `.pill-st` — status chip per class.
function StatusPill({ status }: { status: string }) {
  const theme = useTheme();
  const map: Record<string, { bg: string; fg: string; label: string; strike?: boolean }> = {
    now: { bg: theme.color.persimmon, fg: '#fff', label: 'Now' },
    upcoming: { bg: theme.color.paperWarm, fg: theme.color.mist, label: 'Upcoming' },
    done: { bg: theme.color.jadeSoft, fg: theme.color.jade, label: 'Done' },
    cancelled: { bg: theme.color.roseSoft, fg: theme.color.rose, label: 'Cancelled', strike: true },
  };
  const s = map[status] ?? map.upcoming;
  return (
    <View
      style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}
    >
      <Text
        style={{
          fontFamily: sansFor(800),
          fontSize: 10.5,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: s.fg,
          textDecorationLine: s.strike ? 'line-through' : 'none',
        }}
      >
        {s.label}
      </Text>
    </View>
  );
}

function ScheduleSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ backgroundColor: theme.color.ivory, borderRadius: 16, padding: 14 }}>
          <SkeletonLoader height={14} width="30%" style={{ marginBottom: 8 }} />
          <SkeletonLoader height={13} width="60%" />
        </View>
      ))}
    </View>
  );
}

export default function ScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [focused, setFocused] = useState(new Date());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPick, setCancelPick] = useState<any>(null);

  const week = startOfWeek(focused, { weekStartsOn: 1 });
  const weekStart = format(week, 'yyyy-MM-dd');
  const isCurrentWeek =
    weekStart === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data, isLoading, isError, refetch } = useStudioSchedule({ week_start: weekStart });
  const { data: trialsData } = useStudioInbox({ refetchInterval: 60_000 });
  const cancelSession = useCancelSession();

  const days = (data as any)?.days ?? [];

  // Count classes per IST date so the strip dot lands on the right day.
  const batchCountByDate: Record<string, number> = {};
  days.forEach((day: any) => {
    (day.items ?? []).forEach((item: any) => {
      const key = item.start_time ? istDateKey(item.start_time) : day.date;
      batchCountByDate[key] = (batchCountByDate[key] ?? 0) + 1;
    });
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const focusedStr = format(focused, 'yyyy-MM-dd');
  const focusedDay = days.find((day: any) => day.date === focusedStr);
  const dayItems: any[] = focusedDay?.items ?? [];
  const focusedIsToday = isToday(focused);

  // Trials scheduled on the focused day (sourced from the inbox — schedule API
  // returns classes only). Sorted by time.
  const trialsToday: any[] = ((trialsData as any)?.items ?? [])
    .filter((trial: any) => trial.scheduled_at && istDateKey(trial.scheduled_at) === focusedStr)
    .sort((trialA: any, trialB: any) =>
      String(trialA.scheduled_at).localeCompare(String(trialB.scheduled_at))
    );

  // Classes that can still be cancelled on the focused day.
  const cancellable = dayItems.filter((i) => i.status !== 'cancelled' && i.status !== 'done');

  const openCancelSheet = () => {
    setCancelPick(cancellable[0] ?? null);
    setCancelOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancelPick || cancelSession.isPending) return;
    try {
      await cancelSession.mutateAsync({
        batch_id: cancelPick.batch_id,
        session_date: cancelPick.session_date,
      });
      setCancelOpen(false);
      setCancelPick(null);
      showToast('Class cancelled · make-good session added', 'success');
    } catch {
      showToast('Failed to cancel class', 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: sansFor(700),
                fontSize: 11,
                letterSpacing: 1.8,
                color: theme.color.persimmon,
              }}
            >
              TIMETABLE
            </Text>
            <Text
              style={{
                fontFamily: theme.font.serif,
                fontSize: 34,
                lineHeight: 38,
                letterSpacing: -0.6,
                color: theme.color.ink,
                marginTop: 4,
              }}
            >
              Schedule
            </Text>
          </View>
          <Pressable
            style={[
              styles.batchesBtn,
              { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
            ]}
            onPress={() => router.push('/programs' as any)}
          >
            <Text style={{ fontFamily: sansFor(600), fontSize: 12, color: theme.color.ink }}>
              Programs
            </Text>
          </Pressable>
        </View>

        {/* Week navigator */}
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setFocused((prev) => addDays(prev, -7))}
            hitSlop={8}
            style={[
              styles.navBtn,
              { borderColor: theme.color.hairline, backgroundColor: theme.color.ivory },
            ]}
            accessibilityLabel="Previous week"
          >
            <IconChevL size={18} color={theme.color.ink} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }}>
              {format(week, 'd MMM')} – {format(addDays(week, 6), 'd MMM')}
            </Text>
            {!isCurrentWeek ? (
              <Pressable
                onPress={() => setFocused(new Date())}
                style={[styles.todayPill, { backgroundColor: theme.color.persimmonSoft }]}
              >
                <Text
                  style={{
                    fontFamily: sansFor(700),
                    fontSize: 11,
                    color: theme.color.persimmonDeep,
                  }}
                >
                  Today
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFocused((prev) => addDays(prev, 7))}
            hitSlop={8}
            style={[
              styles.navBtn,
              { borderColor: theme.color.hairline, backgroundColor: theme.color.ivory },
            ]}
            accessibilityLabel="Next week"
          >
            <IconChevR size={18} color={theme.color.ink} />
          </Pressable>
        </View>

        {/* 7-day week strip */}
        <View style={styles.weekStrip}>
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const selected = dateStr === focusedStr;
            const count = batchCountByDate[dateStr] ?? 0;
            const empty = count === 0 && !selected;
            return (
              <Pressable
                key={dateStr}
                onPress={() => setFocused(day)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: selected ? theme.color.ink : theme.color.ivory,
                    borderColor: selected ? theme.color.ink : theme.color.hairline,
                    opacity: empty ? 0.42 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: sansFor(700),
                    fontSize: 10.5,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: selected ? 'rgba(255,255,255,0.6)' : theme.color.whisper,
                  }}
                >
                  {format(day, 'EEE')}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.font.serif,
                    fontSize: 18,
                    lineHeight: 22,
                    marginTop: 2,
                    color: selected ? theme.color.ivory : theme.color.ink,
                  }}
                >
                  {format(day, 'd')}
                </Text>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: count > 0 ? theme.color.persimmon : 'transparent' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Focused-day classes */}
        <View style={{ paddingHorizontal: 22 }}>
          {isLoading ? (
            <ScheduleSkeleton />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <>
              <View style={styles.secHead}>
                <Text
                  style={{
                    fontFamily: sansFor(800),
                    fontSize: 20,
                    letterSpacing: -0.4,
                    color: theme.color.ink,
                  }}
                >
                  {format(focused, 'EEEE, d MMMM')}
                  {focusedIsToday ? (
                    <Text
                      style={{ fontFamily: theme.font.serifItalic, color: theme.color.persimmon }}
                    >
                      {' '}
                      · today
                    </Text>
                  ) : null}
                </Text>
                <Text style={{ fontFamily: sansFor(600), fontSize: 12.5, color: theme.color.mist }}>
                  {dayItems.length} {dayItems.length === 1 ? 'class' : 'classes'}
                </Text>
              </View>

              {dayItems.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
                  ]}
                >
                  <Text
                    style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}
                  >
                    No classes scheduled this day.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {dayItems.map((item) => {
                    const start = new Date(item.start_time ?? '');
                    if (Number.isNaN(start.getTime())) return null;
                    const cat = (item.category ?? '').toLowerCase();
                    const catColor =
                      cat === 'arts'
                        ? theme.color.persimmon
                        : (CATEGORY_COLORS[cat] ?? theme.color.mist);
                    const cancelled = item.status === 'cancelled';
                    const online = item.mode === 'online';
                    return (
                      <Pressable
                        key={`${item.batch_id}:${item.session_date}`}
                        style={[
                          styles.sch,
                          {
                            backgroundColor: theme.color.ivory,
                            borderColor: theme.color.hairline,
                            opacity: cancelled ? 0.72 : 1,
                          },
                          theme.shadow.sm,
                        ]}
                        onPress={() =>
                          // Past/cancelled classes → read-only record (no attendance/live launcher);
                          // current/upcoming → batch detail (where attendance can be taken).
                          item.status === 'done' || item.status === 'cancelled'
                            ? router.push({
                                pathname: '/batches/[id]/session',
                                params: {
                                  id: item.batch_id,
                                  date: item.session_date,
                                  title: item.batch_title ?? 'Class',
                                  status: item.status,
                                  mode: item.mode ?? 'in-studio',
                                },
                              } as any)
                            : router.push(`/batches/${item.batch_id}` as any)
                        }
                      >
                        <View style={styles.rail}>
                          <Text
                            style={{
                              fontFamily: theme.font.serif,
                              fontSize: 15,
                              color: theme.color.ink,
                            }}
                          >
                            {format(start, 'h:mm')}
                          </Text>
                          <Text
                            style={{
                              fontFamily: sansFor(600),
                              fontSize: 11,
                              color: theme.color.whisper,
                              marginTop: 1,
                            }}
                          >
                            {format(start, 'a')}
                          </Text>
                        </View>
                        <View style={[styles.cdot, { backgroundColor: catColor }]} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              fontFamily: sansFor(700),
                              fontSize: 14,
                              color: theme.color.ink,
                            }}
                            numberOfLines={1}
                          >
                            {item.batch_title ?? 'Batch'}
                          </Text>
                          {cancelled ? (
                            <Text
                              style={{
                                fontFamily: sansFor(500),
                                fontSize: 12,
                                color: theme.color.rose,
                                marginTop: 3,
                              }}
                              numberOfLines={2}
                            >
                              Cancelled · +1 make-good session (count preserved)
                            </Text>
                          ) : (
                            <Text
                              style={{
                                fontFamily: sansFor(500),
                                fontSize: 12,
                                color: theme.color.mist,
                                marginTop: 3,
                              }}
                              numberOfLines={1}
                            >
                              {[
                                item.coach_name,
                                `${item.enrolled_count ?? 0}/${item.capacity ?? 0} students`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                              {online ? (
                                <Text style={{ fontFamily: sansFor(700), color: theme.color.jade }}>
                                  {'  Online'}
                                </Text>
                              ) : null}
                            </Text>
                          )}
                        </View>
                        <StatusPill status={item.status ?? 'upcoming'} />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Trials on the focused day */}
              {trialsToday.length > 0 ? (
                <>
                  <View style={[styles.secHead, { marginTop: 22 }]}>
                    <Text
                      style={{
                        fontFamily: sansFor(800),
                        fontSize: 20,
                        letterSpacing: -0.4,
                        color: theme.color.ink,
                      }}
                    >
                      {focusedIsToday ? 'Trials today' : 'Trials'}
                    </Text>
                  </View>
                  <View style={{ gap: 10 }}>
                    {trialsToday.map((trial) => {
                      const start = trial.scheduled_at ? new Date(trial.scheduled_at) : null;
                      const startValid = start && !Number.isNaN(start.getTime());
                      return (
                        <Pressable
                          key={trial.id}
                          style={[
                            styles.sch,
                            {
                              backgroundColor: theme.color.ivory,
                              borderColor: theme.color.hairline,
                            },
                            theme.shadow.sm,
                          ]}
                          onPress={() => router.push(`/trial/${trial.id}` as any)}
                        >
                          <View style={styles.rail}>
                            <Text
                              style={{
                                fontFamily: theme.font.serif,
                                fontSize: 15,
                                color: theme.color.ink,
                              }}
                            >
                              {startValid ? format(start!, 'h:mm') : '—'}
                            </Text>
                            <Text
                              style={{
                                fontFamily: sansFor(600),
                                fontSize: 11,
                                color: theme.color.whisper,
                                marginTop: 1,
                              }}
                            >
                              {startValid ? format(start!, 'a') : ''}
                            </Text>
                          </View>
                          <View style={[styles.cdot, { backgroundColor: theme.color.persimmon }]} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={{
                                fontFamily: sansFor(700),
                                fontSize: 14,
                                color: theme.color.ink,
                              }}
                              numberOfLines={1}
                            >
                              {getTrialTitle(trial)}
                            </Text>
                            <Text
                              style={{
                                fontFamily: sansFor(500),
                                fontSize: 12,
                                color: theme.color.mist,
                                marginTop: 3,
                              }}
                            >
                              Trial · verify OTP at class
                            </Text>
                          </View>
                          <IconChevR size={18} color={theme.color.whisper} />
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {/* Cancel-a-class entry */}
              {cancellable.length > 0 ? (
                <Button variant="soft" block style={{ marginTop: 18 }} onPress={openCancelSheet}>
                  Cancel a class
                </Button>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {/* Cancel-class sheet */}
      <Modal
        visible={cancelOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelOpen(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setCancelOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.color.paper }]}
            onPress={() => {}}
          >
            <View style={[styles.grab, { backgroundColor: theme.color.hairline }]} />
            <View style={styles.sheetHead}>
              <Text style={{ fontFamily: theme.font.serif, fontSize: 24, color: theme.color.ink }}>
                Cancel a class
              </Text>
              <Pressable hitSlop={8} onPress={() => setCancelOpen(false)}>
                <IconX size={20} color={theme.color.mist} />
              </Pressable>
            </View>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 13,
                color: theme.color.mist,
                marginBottom: 14,
              }}
            >
              Pick the class to cancel. Students are notified.
            </Text>

            <View style={{ gap: 8, marginBottom: 12 }}>
              {cancellable.map((item) => {
                const sel =
                  cancelPick &&
                  cancelPick.batch_id === item.batch_id &&
                  cancelPick.session_date === item.session_date;
                const start = new Date(item.start_time ?? '');
                const timeLabel = Number.isNaN(start.getTime())
                  ? ''
                  : ` · ${format(start, 'h:mm a')}`;
                return (
                  <Pressable
                    key={`${item.batch_id}:${item.session_date}`}
                    onPress={() => setCancelPick(item)}
                    style={[
                      styles.opt,
                      {
                        borderColor: sel ? theme.color.persimmon : theme.color.hairline,
                        backgroundColor: sel ? theme.color.persimmonSoft : theme.color.ivory,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}
                      >
                        {item.batch_title}
                        {timeLabel}
                      </Text>
                      <Text
                        style={{
                          fontFamily: sansFor(500),
                          fontSize: 12,
                          color: theme.color.mist,
                          marginTop: 2,
                        }}
                      >
                        {[item.coach_name, `${item.enrolled_count ?? 0} students`]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        { borderColor: sel ? theme.color.persimmon : theme.color.hairline },
                      ]}
                    >
                      {sel ? (
                        <View
                          style={[styles.radioDot, { backgroundColor: theme.color.persimmon }]}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Make-good policy */}
            <View style={[styles.policy, { backgroundColor: theme.color.jadeSoft }]}>
              <Text
                style={{
                  fontFamily: theme.font.sans,
                  fontSize: 12.5,
                  lineHeight: 18,
                  color: theme.color.jade,
                }}
              >
                <Text style={{ fontFamily: sansFor(800) }}>Not billed.</Text> A cancelled class
                isn't counted as a paid session —{' '}
                <Text style={{ fontFamily: sansFor(800) }}>1 make-good session is added</Text> so
                each student still gets their full plan (e.g. 8 classes stays 8, not a bonus class).
              </Text>
            </View>

            <Button
              variant="rose"
              block
              loading={cancelSession.isPending}
              disabled={!cancelPick}
              onPress={confirmCancel}
            >
              Cancel class & add session
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// Trial row title: "{batch} — Trial · {student}" when both known.
function getTrialTitle(trial: any): string {
  const base = trial.batch_title ?? 'Trial';
  return trial.student_name ? `${base} · ${trial.student_name}` : base;
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  batchesBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rail: {
    alignItems: 'center',
    minWidth: 52,
  },
  cdot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,16,14,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  policy: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
});
