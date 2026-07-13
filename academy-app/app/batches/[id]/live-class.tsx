import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, sansFor, Button, IconUser } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SessionRoster } from '@/components/schedule/SessionRoster';
import { useStartLive, useSessionAttendance, useStudioBatch } from '@/hooks/useStudioQueries';

// S3.3: academy host screen for an ONLINE batch. "Start live class" gets a host token for the
// batch's 100ms room; students who join are auto-marked present by the peer.join webhook.
// The real video stage uses @100ms/react-native-sdk (HMSSDK.join with `host_token`) — a native
// module needing a dev build + camera/mic permissions. The token + roster data flow is wired;
// swap the placeholder stage for the SDK on a device.
export default function LiveClassScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const startLive = useStartLive();
  const [live, setLive] = useState(false);
  const { data: roster } = useSessionAttendance({ batchId: id, enabled: live });
  const { data: batchData } = useStudioBatch(id);

  const batch = batchData?.batch;
  const startTime = batch?.timings?.[0]?.start_time;

  const start = async () => {
    await startLive.mutateAsync(id); // host token (consumed by the 100ms SDK on a dev build)
    setLive(true);
  };

  const rows = roster?.roster ?? [];

  return (
    <Screen header={<ScreenHeader title="Live class" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {!live ? (
          <>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.inkSoft, marginBottom: 16, lineHeight: 20 }}>
              Start the live class. Students join from their app and are marked present automatically
              when they connect.
            </Text>
            <Button onPress={start} block loading={startLive.isPending}>
              Start live class
            </Button>
          </>
        ) : (
          <>
            <View style={styles.topRow}>
              <View style={[styles.livePill, { backgroundColor: theme.color.roseSoft }]}>
                <View style={[styles.dot, { backgroundColor: theme.color.rose }]} />
                <Text style={{ fontFamily: sansFor(700), fontSize: 11.5, color: theme.color.rose }}>Live</Text>
              </View>
              <Text style={{ fontFamily: sansFor(600), fontSize: 12, color: theme.color.mist }}>Findemy room</Text>
            </View>

            <Text style={{ fontFamily: theme.font.serif, fontSize: 26, color: theme.color.ink }}>
              {batch?.title ?? 'Live class'}
            </Text>
            <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.mist, marginBottom: 4 }}>
              Today{startTime ? ` · ${startTime}` : ''}
            </Text>

            {/* Real 100ms host video stage (native — dev build). */}
            <View style={[styles.stage, { backgroundColor: theme.color.ink }]}>
              <View style={[styles.camCircle, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <IconUser size={30} color="rgba(255,255,255,0.55)" />
              </View>
              <View style={styles.selfTag}>
                <Text style={{ fontFamily: sansFor(600), fontSize: 11, color: theme.color.ivory }}>You · Coach</Text>
              </View>
            </View>

            <View style={styles.countRow}>
              <Text style={{ fontFamily: theme.font.serif, fontSize: 30, color: theme.color.ink }}>
                {roster?.present_count ?? 0}
              </Text>
              <Text style={{ fontFamily: sansFor(600), fontSize: 14, color: theme.color.mist, marginBottom: 4 }}>
                of {roster?.total ?? 0} joined · marked present automatically
              </Text>
            </View>
            <Text style={{ fontFamily: sansFor(500), fontSize: 12.5, color: theme.color.mist, lineHeight: 18, textAlign: 'center' }}>
              Students join from Findemy → Your classes → Join live class. Anyone who joins is marked present.
            </Text>

            <SessionRoster rows={rows} verb="Joined" />

            <View style={{ height: 8 }} />
            <Button variant="rose" onPress={() => router.back()} block>
              End class
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 16, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  stage: { height: 210, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 4 },
  camCircle: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  selfTag: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  countRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: 'center', marginTop: 4 },
});
