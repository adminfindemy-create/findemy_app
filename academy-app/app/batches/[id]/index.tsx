import { ErrorState } from '@/components/common/ErrorState';
import { SegChoice } from '@/components/common/SegChoice';
import { SessionRoster } from '@/components/schedule/SessionRoster';
import { TierBadge } from '@/components/students/TierBadge';
import {
  useBatchStudents,
  useSessionAttendance,
  useStudioBatch,
  useUpdateBatch,
} from '@/hooks/useStudioQueries';
import { IconChevL, IconChevR, IconQr, IconUsers, sansFor, useTheme } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function BatchHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { data: batchData, isLoading, isError, refetch } = useStudioBatch(id);
  const { data: rosterData } = useBatchStudents(id);
  const updateBatch = useUpdateBatch(id);

  const batch = batchData?.batch;
  const roster = rosterData?.students ?? [];
  const [panel, setPanel] = useState<'att' | 'roster' | 'edit'>('att');

  // Live "N of M checked in / joined" session roster (real data — active enrolees split by
  // today's check-in rows; no QR token needed). Polls every 5s while the Attendance tab is open.
  const { data: session } = useSessionAttendance({ batchId: id, enabled: panel === 'att' });
  const sessionRows = session?.roster ?? [];

  // Edit-tab quick-edit state (schedule + mode), seeded from the loaded batch.
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('18:00');
  const [durationMin, setDurationMin] = useState('60');
  const [mode, setMode] = useState<'in-studio' | 'online'>('in-studio');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (!batch) return;
    const timings = batch.timings ?? [];
    setDays([...new Set(timings.map((timing) => timing.day_of_week))].sort());
    if (timings[0]) {
      setStartTime(timings[0].start_time || '18:00');
      setDurationMin(String(timings[0].duration_min || 60));
    }
    setMode(batch.mode === 'online' ? 'online' : 'in-studio');
    setStatus(batch.status === 'inactive' ? 'inactive' : 'active');
  }, [batch]);

  const BackButton = () => (
    <Pressable
      onPress={() => router.back()}
      style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
      hitSlop={8}
    >
      <IconChevL size={20} color={theme.color.ivory} />
    </Pressable>
  );

  if (isError) {
    return (
      <View
        style={[styles.root, { backgroundColor: theme.color.ink, paddingTop: insets.top + 12 }]}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <BackButton />
        </View>
        <View style={{ flex: 1, backgroundColor: theme.color.paperWarm }}>
          <ErrorState message="Couldn't load this batch." onRetry={refetch} />
        </View>
      </View>
    );
  }
  if (isLoading || !batch) {
    return (
      <View
        style={[styles.root, { backgroundColor: theme.color.ink, paddingTop: insets.top + 12 }]}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <BackButton />
        </View>
        <View style={{ flex: 1, backgroundColor: theme.color.paperWarm }}>
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  const online = batch.mode === 'online';
  const timings = batch.timings ?? [];
  const daysLabel = [...new Set(timings.map((timing) => timing.day_of_week))]
    .sort()
    .map((dayNum) => DOW[dayNum])
    .join(' · ');
  const timeLabel = timings[0]?.start_time ?? '';
  const metaBits = [
    batch.coach_name,
    daysLabel || null,
    timeLabel || null,
    online ? 'Online · Findemy room' : 'In-studio',
  ]
    .filter(Boolean)
    .join(' · ');
  const enrolled = roster.length;
  const capacity = batch.capacity ?? null;

  const toggleDay = (dayNum: number) =>
    setDays((prev) =>
      prev.includes(dayNum) ? prev.filter((day) => day !== dayNum) : [...prev, dayNum].sort()
    );

  const saveSchedule = async () => {
    const dur = Number(durationMin) || 60;
    try {
      await updateBatch.mutateAsync({
        mode,
        timings: days.map((dayNum) => ({
          day_of_week: dayNum,
          start_time: startTime,
          duration_min: dur,
        })),
      });
      Alert.alert('Saved', 'Schedule updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save');
    }
  };

  const togglePause = () => {
    const next = status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      next === 'inactive' ? 'Pause this batch?' : 'Resume this batch?',
      next === 'inactive'
        ? 'Stops new sign-ups. Enrolled students are notified.'
        : 'Re-opens the batch for new sign-ups.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next === 'inactive' ? 'Pause' : 'Resume',
          onPress: async () => {
            setStatus(next);
            try {
              await updateBatch.mutateAsync({ status: next });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed');
            }
          },
        },
      ]
    );
  };

  const goSession = () =>
    router.push((online ? `/batches/${id}/live-class` : `/batches/${id}/attendance`) as never);

  return (
    <View style={[styles.root, { backgroundColor: theme.color.paperWarm }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: panel === 'att' ? 12 : insets.bottom + 24 }}
      >
        {/* Full-bleed dark hero (edge-to-edge, into the status bar) */}
        <View
          style={[styles.hero, { backgroundColor: theme.color.ink, paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroTop}>
            <BackButton />
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    batch.status === 'closing' || batch.status === 'ended'
                      ? theme.color.roseSoft
                      : theme.color.jadeSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      batch.status === 'closing' || batch.status === 'ended'
                        ? theme.color.rose
                        : theme.color.jade,
                  },
                ]}
              >
                {batch.status === 'closing'
                  ? 'Closing'
                  : batch.status === 'ended'
                    ? 'Ended'
                    : status === 'active'
                      ? 'Active'
                      : 'Paused'}
              </Text>
            </View>
            {online ? (
              <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
                <Text style={[styles.badgeText, { color: theme.color.jade }]}>Online</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 28,
              color: theme.color.ivory,
              lineHeight: 32,
            }}
          >
            {batch.title}
          </Text>
          <Text
            style={{
              fontFamily: sansFor(600),
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 6,
            }}
          >
            {metaBits}
          </Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.13)' }]}>
              <Text style={[styles.badgeText, { color: theme.color.ivory }]}>
                {enrolled}
                {capacity != null ? ` / ${capacity}` : ''} enrolled
              </Text>
            </View>
            {batch.trial_spots != null ? (
              <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
                <Text style={[styles.badgeText, { color: theme.color.jade }]}>
                  {batch.trial_spots} trial spot{batch.trial_spots === 1 ? '' : 's'} open
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{
              fontFamily: sansFor(500),
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 8,
              lineHeight: 16,
            }}
          >
            Trial spots open automatically from free seats — capacity minus enrolled. No setup
            needed.
          </Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <SegChoice
            items={[
              { key: 'att', label: 'Attendance' },
              { key: 'roster', label: 'Roster' },
              { key: 'edit', label: 'Edit' },
            ]}
            value={panel}
            onChange={(k) => setPanel(k as 'att' | 'roster' | 'edit')}
          />

          {/* ---- ATTENDANCE ---- */}
          {panel === 'att' ? (
            <View style={{ gap: 14 }}>
              <View style={[styles.qrLaunch, { backgroundColor: theme.color.ink }]}>
                <Text style={styles.qrKicker}>
                  Today{timeLabel ? ` · ${timeLabel}` : ''}
                  {online ? ' · Findemy room' : ''}
                </Text>
                <View style={styles.qrCountRow}>
                  <Text
                    style={{ fontFamily: theme.font.serif, fontSize: 30, color: theme.color.ivory }}
                  >
                    {session?.present_count ?? 0}
                  </Text>
                  <Text
                    style={{
                      fontFamily: sansFor(700),
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    of {session?.total ?? enrolled} {online ? 'joined' : 'checked in'}
                  </Text>
                </View>
                <Text style={styles.qrMuted}>
                  {online
                    ? 'Start the live class — students join from their app and are marked present automatically when they join.'
                    : "Students scan this session's QR in their Findemy app to mark themselves present — no manual marking needed."}
                </Text>
                <Pressable
                  style={[styles.jadeBtn, { backgroundColor: theme.color.jade }]}
                  onPress={goSession}
                >
                  {online ? (
                    <IconUsers size={17} color={theme.color.ivory} />
                  ) : (
                    <IconQr size={17} color={theme.color.ivory} />
                  )}
                  <Text
                    style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ivory }}
                  >
                    {online ? 'Start live class →' : 'Show check-in QR →'}
                  </Text>
                </Pressable>
              </View>

              {sessionRows.length > 0 ? (
                <SessionRoster rows={sessionRows} verb={online ? 'Joined' : 'Checked in'} />
              ) : (
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 13,
                    color: theme.color.mist,
                    paddingHorizontal: 2,
                  }}
                >
                  No active enrolees to show yet.
                </Text>
              )}
            </View>
          ) : null}

          {/* ---- ROSTER ---- */}
          {panel === 'roster' ? (
            roster.length === 0 ? (
              <Text
                style={{
                  fontFamily: theme.font.sans,
                  fontSize: 13,
                  color: theme.color.mist,
                  paddingHorizontal: 2,
                }}
              >
                No students enrolled yet.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {roster.map((student) => (
                  <Pressable
                    key={student.id}
                    style={[
                      styles.rosterRow,
                      { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
                    ]}
                    onPress={() => router.push(`/students/${student.id}` as never)}
                  >
                    <View style={[styles.av, { backgroundColor: theme.color.persimmon }]}>
                      <Text
                        style={{
                          fontFamily: theme.font.serifItalic,
                          fontSize: 13,
                          color: theme.color.ivory,
                        }}
                      >
                        {student.name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }}
                        numberOfLines={1}
                      >
                        {student.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: sansFor(500),
                          fontSize: 12,
                          color: theme.color.mist,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {student.attendance_pct != null
                          ? `${student.attendance_pct}% attendance`
                          : 'New'}
                        {student.last_seen ? ` · last seen ${student.last_seen}` : ''}
                      </Text>
                    </View>
                    {student.phone ? (
                      <Pressable
                        onPress={() =>
                          Linking.openURL(`https://wa.me/${student.phone.replace(/\D/g, '')}`)
                        }
                        hitSlop={8}
                        style={{ marginRight: 4 }}
                      >
                        <Text style={{ fontSize: 16 }}>💬</Text>
                      </Pressable>
                    ) : null}
                    <TierBadge tier={student.tier} />
                  </Pressable>
                ))}
              </View>
            )
          ) : null}

          {/* ---- EDIT (quick schedule + mode; full pricing lives in the full editor) ---- */}
          {panel === 'edit' ? (
            <View style={{ gap: 6 }}>
              {batch.description ? (
                <>
                  <Text style={styles.fgh}>About this batch</Text>
                  <Text
                    style={{
                      fontFamily: theme.font.sans,
                      fontSize: 13.5,
                      lineHeight: 20,
                      color: theme.color.inkSoft,
                    }}
                  >
                    {batch.description}
                  </Text>
                </>
              ) : null}
              {batch.things_to_know && batch.things_to_know.length > 0 ? (
                <>
                  <Text style={[styles.fgh, { marginTop: 12 }]}>Things to know</Text>
                  <View style={{ gap: 6 }}>
                    {batch.things_to_know.map((note, index) => (
                      <View key={index} style={{ flexDirection: 'row', gap: 8 }}>
                        <Text
                          style={{
                            color: theme.color.persimmon,
                            fontFamily: sansFor(800),
                            fontSize: 13,
                          }}
                        >
                          •
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: theme.font.sans,
                            fontSize: 13.5,
                            lineHeight: 20,
                            color: theme.color.inkSoft,
                          }}
                        >
                          {note}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
              <Text
                style={[
                  styles.fgh,
                  batch.description || batch.things_to_know?.length ? { marginTop: 12 } : undefined,
                ]}
              >
                Days
              </Text>
              <View style={styles.dayRow}>
                {DAY_LABELS.map((label, index) => {
                  const on = days.includes(index);
                  return (
                    <Pressable
                      key={index}
                      onPress={() => toggleDay(index)}
                      style={[
                        styles.dayToggle,
                        {
                          backgroundColor: on ? theme.color.ink : theme.color.ivory,
                          borderColor: on ? theme.color.ink : theme.color.hairline,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: sansFor(700),
                          fontSize: 13,
                          color: on ? theme.color.ivory : theme.color.mist,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fgh}>Start</Text>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="18:00"
                    placeholderTextColor={theme.color.mist}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.color.ivory,
                        borderColor: theme.color.hairline,
                        color: theme.color.ink,
                      },
                    ]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fgh}>Duration (min)</Text>
                  <TextInput
                    value={durationMin}
                    onChangeText={setDurationMin}
                    keyboardType="number-pad"
                    placeholder="60"
                    placeholderTextColor={theme.color.mist}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.color.ivory,
                        borderColor: theme.color.hairline,
                        color: theme.color.ink,
                      },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.fgh}>Mode</Text>
              <SegChoice
                items={[
                  { key: 'in-studio', label: 'In studio' },
                  { key: 'online', label: 'Online' },
                ]}
                value={mode}
                onChange={(k) => setMode(k as 'in-studio' | 'online')}
              />
              {mode === 'online' ? (
                <View style={[styles.notice, { backgroundColor: theme.color.jadeSoft }]}>
                  <IconUsers size={18} color={theme.color.jade} />
                  <Text
                    style={{
                      fontFamily: sansFor(600),
                      fontSize: 12,
                      color: theme.color.jade,
                      flex: 1,
                      lineHeight: 17,
                    }}
                  >
                    Online batches run in a Findemy video room — no link to share. Tap "Start live
                    class" at class time.
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.saveBtn,
                  { backgroundColor: theme.color.persimmon },
                  updateBatch.isPending && { opacity: 0.6 },
                ]}
                disabled={updateBatch.isPending}
                onPress={saveSchedule}
              >
                <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ivory }}>
                  Save changes
                </Text>
              </Pressable>

              <Pressable
                style={[styles.softBtn, { backgroundColor: theme.color.marigoldSoft }]}
                onPress={togglePause}
              >
                <Text
                  style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.marigold }}
                >
                  {status === 'active' ? 'Pause this batch' : 'Resume this batch'}
                </Text>
              </Pressable>

              {/* M5.2: teacher-uploaded study material for this batch. */}
              <Pressable
                style={styles.linkRow}
                onPress={() => router.push(`/batches/${id}/resources` as never)}
              >
                <Text
                  style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.persimmon }}
                >
                  Manage study material & resources
                </Text>
                <IconChevR size={16} color={theme.color.persimmon} />
              </Pressable>

              <Pressable
                style={styles.linkRow}
                onPress={() => router.push(`/batches/${id}/edit` as never)}
              >
                <Text
                  style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.persimmon }}
                >
                  Edit pricing, fees & delete
                </Text>
                <IconChevR size={16} color={theme.color.persimmon} />
              </Pressable>

              {/* Discontinuation (active → closing → ended) */}
              {batch.status === 'ended' ? (
                <Text
                  style={{
                    fontFamily: sansFor(600),
                    fontSize: 12.5,
                    color: theme.color.mist,
                    textAlign: 'center',
                    marginTop: 14,
                  }}
                >
                  This batch has been discontinued.
                </Text>
              ) : (
                <Pressable
                  style={styles.linkRow}
                  onPress={() => router.push(`/batches/${id}/discontinue` as never)}
                >
                  <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.rose }}>
                    {batch.status === 'closing'
                      ? 'Discontinuation in progress →'
                      : 'Discontinue this batch'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom action bar (Attendance tab) */}
      {panel === 'att' ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.color.paperWarm,
              borderTopColor: theme.color.hairline,
              paddingBottom: insets.bottom + 10,
            },
          ]}
        >
          <Pressable
            style={[styles.darkBar, { backgroundColor: theme.color.ink }]}
            onPress={goSession}
          >
            <Text style={{ fontFamily: sansFor(700), fontSize: 14.5, color: theme.color.ivory }}>
              {online ? 'Start live class →' : 'Show check-in QR →'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: { paddingHorizontal: 20, paddingBottom: 22 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontFamily: sansFor(800), fontSize: 10.5, letterSpacing: 0.3 },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  qrLaunch: { borderRadius: 18, padding: 18, alignItems: 'center' },
  qrKicker: {
    fontFamily: sansFor(700),
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  qrCountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 7,
    marginBottom: 3,
  },
  qrMuted: {
    fontFamily: sansFor(500),
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  jadeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 14,
  },

  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  av: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  fgh: {
    fontFamily: sansFor(700),
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8A8071',
    marginTop: 12,
    marginBottom: 8,
  },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayToggle: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoCol: { flexDirection: 'row', gap: 8 },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 15,
    fontFamily: sansFor(400),
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  saveBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  softBtn: { marginTop: 10, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    paddingVertical: 4,
  },

  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  darkBar: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
});
