import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useMissedClasses } from '@/hooks/useMissedClasses';
import type { MissedSession } from '@findemy/types';
import { useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// M3.1: Missed Classes — sessions with an explicit "not checked in" write. Shows whatever
// reason/recording link the academy attached. Recording links open externally (no in-app
// player) and there is deliberately NO reschedule action anywhere on this screen.
function MissedClassRow({ session }: { session: MissedSession }) {
  const theme = useTheme();
  const dateLabel = (() => {
    const parsed = new Date(`${session.session_date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? session.session_date
      : format(parsed, 'EEE, d MMM yyyy');
  })();
  const subText = [session.academy_name, session.coach_name].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
      ]}
    >
      <View style={styles.rowHead}>
        <Text
          style={[styles.title, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}
          numberOfLines={1}
        >
          {session.batch_title}
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.color.roseSoft }]}>
          <Text
            style={[styles.badgeText, { fontFamily: theme.font.sansBold, color: theme.color.rose }]}
          >
            Missed
          </Text>
        </View>
      </View>
      <Text
        style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]}
        numberOfLines={1}
      >
        {`${dateLabel}${subText ? ` · ${subText}` : ''}`}
      </Text>

      {session.reason ? (
        <Text style={[styles.reason, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
          {session.reason}
        </Text>
      ) : null}

      {session.recording_url ? (
        <Pressable
          onPress={() => Linking.openURL(session.recording_url as string)}
          style={({ pressed }) => [
            styles.recordingLink,
            { borderColor: theme.color.hairline },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="link"
          accessibilityLabel="Open recording link"
        >
          <Text
            style={[
              styles.recordingText,
              { fontFamily: theme.font.sansBold, color: theme.color.persimmon },
            ]}
          >
            Watch recording ↗
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function MissedClassesScreen() {
  const theme = useTheme();
  const missedQ = useMissedClasses();
  const items = missedQ.data?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="Missed classes" />

      {missedQ.isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <SkeletonLoader height={90} borderRadius={16} />
          <SkeletonLoader height={90} borderRadius={16} />
          <SkeletonLoader height={90} borderRadius={16} />
        </View>
      ) : missedQ.isError ? (
        <ErrorState code={(missedQ.error as any)?.code} onRetry={missedQ.refetch} />
      ) : items.length === 0 ? (
        <EmptyState message="No missed classes. Sessions you don't check into will show up here, along with any reason or recording your academy shares." />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {items.map((session: MissedSession) => (
            <MissedClassRow key={session.id} session={session} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { fontSize: 15, letterSpacing: -0.1, flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  sub: { fontSize: 12, marginTop: 3 },
  reason: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  recordingLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recordingText: { fontSize: 12.5 },
});
