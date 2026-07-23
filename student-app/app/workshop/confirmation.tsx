import { useWorkshop, useWorkshopRegistrationStatus } from '@/hooks/useWorkshops';
import { getWorkshopImage } from '@/lib/eventImages';
import { Button, IconCal, IconCheck, Summary, SummaryRow, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WorkshopConfirmationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { workshop_id, title } = useLocalSearchParams<{
    registration_id: string;
    workshop_id: string;
    title: string;
  }>();

  const regStatus = useWorkshopRegistrationStatus(workshop_id);
  const workshopQ = useWorkshop(workshop_id);
  const workshop = (workshopQ.data as any)?.workshop;
  const wsTitle = workshop?.title ?? title ?? 'Workshop';
  const start = workshop?.start_at ? new Date(workshop.start_at) : null;
  const whenLabel =
    start && !Number.isNaN(start.getTime()) ? format(start, 'EEE, d MMM · h:mm a') : null;
  const cover = getWorkshopImage(workshop?.type);

  const [timedOut, setTimedOut] = useState(false);
  const isConfirmed = regStatus.data?.status === 'confirmed';

  useEffect(() => {
    if (isConfirmed) return;
    const interval = setInterval(() => regStatus.refetch(), 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
    }, 30_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isConfirmed]);

  if (!isConfirmed && !timedOut) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.mist }}>
            Confirming your registration…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (timedOut && !isConfirmed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 15,
              color: theme.color.mist,
              textAlign: 'center',
              lineHeight: 21,
            }}
          >
            Still processing. You'll get a notification when confirmed.
          </Text>
          <View style={{ marginTop: 24, alignSelf: 'stretch', paddingHorizontal: 20 }}>
            <Button onPress={() => router.replace('/bookings')} block>
              Done
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {/* Success hero */}
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: theme.color.jade }]}>
            <IconCheck size={30} color={theme.color.ivory} />
          </View>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 34,
              color: theme.color.ink,
              lineHeight: 38,
              letterSpacing: -0.5,
              textAlign: 'center',
              marginTop: 18,
            }}
          >
            {"You're "}
            <Text style={{ fontFamily: theme.font.serifItalic, color: theme.color.jade }}>
              registered
            </Text>
            {'!'}
          </Text>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 13.5,
              color: theme.color.inkSoft,
              textAlign: 'center',
              lineHeight: 20,
              marginTop: 10,
            }}
          >
            See you at the workshop.
          </Text>
        </View>

        <Summary>
          <ThumbRow cover={cover} label="Workshop" value={wsTitle} last={!whenLabel} />
          {whenLabel ? (
            <SummaryRow
              icon={<IconCal size={18} color={theme.color.jade} />}
              label="When"
              value={whenLabel}
              last
            />
          ) : null}
        </Summary>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Button onPress={() => router.replace('/bookings')} block variant="dark">
            View my bookings
          </Button>
          <Button onPress={() => router.replace('/(tabs)/events')} block variant="ghost">
            Back to events
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function ThumbRow({
    cover,
    label,
    value,
    last,
  }: { cover: string; label: string; value: string; last?: boolean }) {
    return (
      <View
        style={[
          styles.thumbRow,
          { borderBottomColor: theme.color.hairline, borderBottomWidth: last ? 0 : 1 },
        ]}
      >
        <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" transition={150} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: theme.font.sansBold,
              fontSize: 11,
              letterSpacing: 1.1,
              color: theme.color.whisper,
            }}
          >
            {label.toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: theme.font.sansBold,
              fontSize: 14.5,
              color: theme.color.ink,
              marginTop: 1,
            }}
            numberOfLines={2}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 28 },
  mark: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  thumb: { width: 46, height: 46, borderRadius: 12 },
});
