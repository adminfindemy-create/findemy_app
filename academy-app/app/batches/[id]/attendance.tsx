import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, sansFor, Button, IconQr } from '@findemy/ui';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SessionRoster } from '@/components/SessionRoster';
import { useSessionAttendance, useCheckinToken, useStudioBatch } from '@/hooks/useStudioQueries';

// S3.2: in-studio attendance is QR-only. The academy shows a per-session QR; students scan it
// to mark present (no manual marking). The roster below auto-refreshes (5s poll) as scans land.
// The check-in token is issued automatically on open, so this lands straight on the QR (the
// batch-detail "Show check-in QR →" comes here directly — no intermediate button screen).
export default function BatchAttendanceScreen() {
  const theme = useTheme();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const checkinToken = useCheckinToken();
  const { data: roster } = useSessionAttendance({ batchId: id, enabled: !!token });
  const { data: batchData } = useStudioBatch(id);

  const batch = batchData?.batch;
  const startTime = batch?.timings?.[0]?.start_time;

  const issue = async () => {
    setFailed(false);
    try {
      const res = await checkinToken.mutateAsync(id);
      setToken(res.token);
    } catch {
      setFailed(true);
    }
  };

  // Auto-issue the QR on open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await checkinToken.mutateAsync(id);
        if (!cancelled) setToken(res.token);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rows = roster?.roster ?? [];

  return (
    <Screen header={<ScreenHeader title="Check-in QR" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {!token ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
            {failed ? (
              <>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.inkSoft, textAlign: 'center' }}>
                  Couldn't start the check-in session.
                </Text>
                <Button onPress={issue} loading={checkinToken.isPending}>
                  Try again
                </Button>
              </>
            ) : (
              <>
                <ActivityIndicator color={theme.color.persimmon} />
                <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
                  Preparing check-in QR…
                </Text>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.head}>
              {batch?.title ? (
                <Text style={{ fontFamily: sansFor(700), fontSize: 12.5, letterSpacing: 0.3, color: theme.color.persimmon }}>
                  {batch.title}
                </Text>
              ) : null}
              <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.mist, marginTop: 2 }}>
                Today{startTime ? ` · ${startTime}` : ''}
              </Text>
            </View>

            {/* QR frame — `token` is rendered as a scannable QR by react-native-qrcode-svg on a
                dev build (native dep). Styled placeholder keeps the layout truthful until then. */}
            <View style={[styles.qrFrame, { borderColor: theme.color.hairline, backgroundColor: theme.color.ivory }]}>
              <View style={[styles.corner, styles.tl, { borderColor: theme.color.ink }]} />
              <View style={[styles.corner, styles.tr, { borderColor: theme.color.ink }]} />
              <View style={[styles.corner, styles.bl, { borderColor: theme.color.ink }]} />
              <View style={[styles.corner, styles.br, { borderColor: theme.color.ink }]} />
              <IconQr size={72} color={theme.color.ink} />
              <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: theme.color.mist, marginTop: 10 }}>
                Scan from the student app
              </Text>
            </View>

            <View style={styles.countRow}>
              <Text style={{ fontFamily: theme.font.serif, fontSize: 30, color: theme.color.ink }}>
                {roster?.present_count ?? 0}
              </Text>
              <Text style={{ fontFamily: sansFor(600), fontSize: 14, color: theme.color.mist, marginBottom: 4 }}>
                of {roster?.total ?? 0} checked in
              </Text>
            </View>

            <SessionRoster rows={rows} verb="Checked in" />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16, gap: 16 },
  head: { alignItems: 'center' },
  qrFrame: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 22, height: 22 },
  tl: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: 'center' },
});
