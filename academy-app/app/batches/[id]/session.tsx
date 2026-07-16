import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTheme, sansFor, IconChevL, IconCheck, Input, Button } from '@findemy/ui';
import { SessionRoster } from '@/components/schedule/SessionRoster';
import { useSessionAttendance } from '@/hooks/useStudioQueries';
import { api } from '@/lib/api';

// Read-only record of a PAST class session (reached from the Schedule tab). No QR /
// live-class launcher — a finished class can't take attendance; it shows the record.
export default function SessionRecordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string | string[];
    date?: string;
    title?: string;
    status?: string;
    mode?: string;
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const title = (Array.isArray(params.title) ? params.title[0] : params.title) || 'Class';
  const status = (Array.isArray(params.status) ? params.status[0] : params.status) || 'done';
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const online = mode === 'online';
  const cancelled = status === 'cancelled';

  const { data, isLoading, refetch } = useSessionAttendance({ batchId: id, date, enabled: !cancelled });

  // M3.1: academy attaches a reason and/or a recording link to this session's absentees
  // (anyone still not-checked-in). Idempotent server-side — resubmitting just updates the note.
  const [reason, setReason] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const markAbsent = useMutation({
    mutationFn: () =>
      api.studio.sessions.markAbsent(id!, date!, {
        reason: reason.trim() || undefined,
        recording_url: recordingUrl.trim() || undefined,
      }),
    onSuccess: () => {
      setSaved(true);
      refetch();
    },
  });

  const dateLabel = (() => {
    if (!date) return '';
    const parsedDate = new Date(`${date}T00:00:00`);
    return isNaN(parsedDate.getTime()) ? date : parsedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  const rows = data?.roster ?? [];
  const total = data?.total ?? 0;
  const present = data?.present_count ?? 0;
  const absent = Math.max(0, total - present);
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  // Attendance-rate accent: strong = jade, ok = marigold, low = rose.
  const rateColor = cancelled ? theme.color.rose : rate >= 75 ? '#7BD0A0' : rate >= 50 ? theme.color.marigold : theme.color.rose;

  const BackButton = () => (
    <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
      <IconChevL size={20} color={theme.color.ivory} />
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.color.paperWarm }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        {/* Full-bleed dark hero */}
        <View style={[styles.hero, { backgroundColor: theme.color.ink, paddingTop: insets.top + 12 }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <BackButton />
            <View style={[styles.badge, { backgroundColor: cancelled ? theme.color.roseSoft : theme.color.jadeSoft }]}>
              {!cancelled ? <IconCheck size={12} color={theme.color.jade} /> : null}
              <Text style={[styles.badgeText, { color: cancelled ? theme.color.rose : theme.color.jade }]}>
                {cancelled ? 'Cancelled' : 'Completed'}
              </Text>
            </View>
            {online ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.13)' }]}>
                <Text style={[styles.badgeText, { color: theme.color.ivory }]}>Online</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ fontFamily: theme.font.serif, fontSize: 30, lineHeight: 34, color: theme.color.ivory, marginTop: 14 }}>
            {title}
          </Text>
          {dateLabel ? (
            <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 5 }}>{dateLabel}</Text>
          ) : null}

          {!cancelled ? (
            <View style={styles.rateBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Text style={{ fontFamily: theme.font.serif, fontSize: 52, lineHeight: 54, color: theme.color.ivory }}>{rate}%</Text>
                <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  attendance
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.track}>
                <View style={{ width: `${rate}%`, height: '100%', backgroundColor: rateColor, borderRadius: 999 }} />
              </View>
              <Text style={{ fontFamily: sansFor(600), fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
                {present} of {total} {online ? 'joined the live class' : 'showed up'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <View style={styles.body}>
          {cancelled ? (
            <View style={[styles.banner, { backgroundColor: theme.color.roseSoft }]}>
              <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.rose, marginBottom: 4 }}>Class cancelled</Text>
              <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.rose, lineHeight: 18 }}>
                Not billed — a make-good session was added so each student keeps their full plan.
              </Text>
            </View>
          ) : isLoading ? (
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, marginTop: 8 }}>Loading record…</Text>
          ) : (
            <>
              {/* Stat tiles */}
              <View style={styles.statRow}>
                <View style={[styles.stat, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                  <Text style={[styles.statNum, { fontFamily: theme.font.serif, color: theme.color.jade }]}>{present}</Text>
                  <Text style={[styles.statLbl, { color: theme.color.whisper }]}>Present</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                  <Text style={[styles.statNum, { fontFamily: theme.font.serif, color: absent > 0 ? theme.color.rose : theme.color.mist }]}>{absent}</Text>
                  <Text style={[styles.statLbl, { color: theme.color.whisper }]}>Absent</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                  <Text style={[styles.statNum, { fontFamily: theme.font.serif, color: theme.color.ink }]}>{total}</Text>
                  <Text style={[styles.statLbl, { color: theme.color.whisper }]}>Enrolled</Text>
                </View>
              </View>

              <Text style={styles.secLabel}>Attendance</Text>
              {rows.length > 0 ? (
                <SessionRoster rows={rows} verb={online ? 'Joined' : 'Checked in'} variant="record" />
              ) : (
                <View style={[styles.banner, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, borderWidth: 1 }]}>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
                    No attendance was recorded for this class.
                  </Text>
                </View>
              )}

              {/* M3.1: note an absence — reason and/or a recording link, shown to affected
                  students on their Missed Classes screen. Applies to whoever's still not
                  checked in for this session; re-saving just updates the note. */}
              {absent > 0 && date ? (
                <View style={{ marginTop: 18, gap: 10 }}>
                  <Text style={styles.secLabel}>Absence note</Text>
                  <Input
                    label="Reason (optional)"
                    placeholder="e.g. Power outage, coach unavailable…"
                    value={reason}
                    onChangeText={(text) => { setReason(text); setSaved(false); }}
                    multiline
                    numberOfLines={3}
                  />
                  <Input
                    label="Recording link (optional)"
                    placeholder="https://…"
                    value={recordingUrl}
                    onChangeText={(text) => { setRecordingUrl(text); setSaved(false); }}
                    keyboardType="default"
                    error={markAbsent.isError ? (markAbsent.error as any)?.message ?? 'Could not save' : undefined}
                  />
                  <Button
                    onPress={() => markAbsent.mutate()}
                    loading={markAbsent.isPending}
                    disabled={!reason.trim() && !recordingUrl.trim()}
                  >
                    {saved ? 'Saved' : 'Save absence note'}
                  </Button>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    right: -60,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(236,90,43,0.28)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontFamily: sansFor(800), fontSize: 10.5, letterSpacing: 0.3 },
  rateBlock: { marginTop: 18 },
  track: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 8 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  banner: { borderRadius: 16, padding: 14 },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  statNum: { fontSize: 26, lineHeight: 28 },
  statLbl: { fontFamily: sansFor(700), fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 },
  secLabel: { fontFamily: sansFor(700), fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8A8071', marginTop: 4 },
});
