import { ErrorState } from '@/components/common/ErrorState';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useStudioTrial } from '@/hooks/useStudioQueries';
import { formatRupees } from '@/lib/format';
import {
  Button,
  IconCal,
  IconCheck,
  IconMappin,
  IconUser,
  IconUsers,
  Summary,
  SummaryRow,
  sansFor,
  useTheme,
} from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

export default function TrialDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useStudioTrial(id);

  if (error) {
    return (
      <Screen header={<ScreenHeader title="Trial detail" showBack />} bottomTab={null}>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }
  if (isLoading || !data) {
    return (
      <Screen header={<ScreenHeader title="Trial detail" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>
          Loading…
        </Text>
      </Screen>
    );
  }

  const { trial, student } = data;
  const online = trial.mode === 'online';
  const attended = trial.status === 'attended';
  const when = trial.scheduled_at ? new Date(trial.scheduled_at) : null;
  const whenValid = when && !Number.isNaN(when.getTime());
  const whenLabel = whenValid ? `${formatDayLabel(when!)} · ${formatTime(when!)}` : null;
  const feePaise = trial.trial_fee_paise;
  const payValue = [
    feePaise != null ? formatRupees(feePaise) : null,
    trial.payment_method || 'Paid',
  ]
    .filter(Boolean)
    .join(' · ');

  const iconColor = theme.color.persimmon;

  return (
    <Screen
      header={<ScreenHeader title="" showBack />}
      bottomTab={null}
      scroll
      footer={
        attended ? undefined : (
          <Button
            variant="dark"
            block
            onPress={() =>
              router.push({
                pathname: '/attendance-otp',
                params: { trialId: id, studentName: student.name },
              })
            }
          >
            Mark attendance →
          </Button>
        )
      }
    >
      <View style={styles.container}>
        {/* Status badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
            <Text style={[styles.badgeText, { color: theme.color.jade }]}>
              {attended ? 'Attended' : trial.status === 'missed' ? 'No-show' : 'Confirmed'}
            </Text>
          </View>
          {online ? (
            <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
              <Text style={[styles.badgeText, { color: theme.color.jade }]}>Online</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.kicker}>Trial booking</Text>
        <Text
          style={{
            fontFamily: theme.font.serif,
            fontSize: 30,
            color: theme.color.ink,
            marginTop: 4,
          }}
        >
          {trial.batch_title}
        </Text>
        <Text
          style={{
            fontFamily: sansFor(600),
            fontSize: 13.5,
            color: theme.color.mist,
            marginTop: 3,
            marginBottom: 18,
          }}
        >
          {[
            whenLabel,
            online
              ? 'Findemy video room'
              : trial.distance_km != null
                ? `${trial.distance_km} km away`
                : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {/* Summary */}
        <Summary>
          <SummaryRow
            icon={<IconUser size={16} color={iconColor} />}
            label="Student"
            value={student.name}
          />
          <SummaryRow
            icon={<IconCal size={16} color={iconColor} />}
            label="Coach"
            value={trial.coach_name || '—'}
          />
          <SummaryRow
            icon={<IconMappin size={16} color={iconColor} />}
            label="Mode"
            value={online ? 'Online' : 'In-studio'}
          />
          <SummaryRow
            icon={
              <Text style={{ color: iconColor, fontFamily: sansFor(800), fontSize: 13 }}>₹</Text>
            }
            label="Payment"
            value={payValue}
            last
          />
        </Summary>

        {/* Auto-confirmed notice */}
        <View style={[styles.notice, { backgroundColor: theme.color.jadeSoft }]}>
          <IconCheck size={18} color={theme.color.jade} />
          <Text
            style={{
              fontFamily: sansFor(600),
              fontSize: 12.5,
              color: theme.color.jade,
              flex: 1,
              lineHeight: 17,
            }}
          >
            {online
              ? "Auto-confirmed. Start the live class, then verify the student's OTP in the session."
              : "Auto-confirmed. Verify the student's OTP when they arrive."}
          </Text>
        </View>

        {/* Online: start the Findemy live room */}
        {online && !attended ? (
          <Button
            variant="soft"
            block
            icon={<IconUsers size={17} color={theme.color.jade} />}
            style={{ marginTop: 14 }}
            onPress={() =>
              trial.batch_id && router.push(`/batches/${trial.batch_id}/live-class` as never)
            }
          >
            Start live class
          </Button>
        ) : null}

        {/* Contact the trial student (kept from existing flow) */}
        {student.phone ? (
          <View style={styles.contactRow}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                size="sm"
                block
                onPress={() => Linking.openURL(`tel:${student.phone}`)}
              >
                Call
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                size="sm"
                block
                onPress={() => Linking.openURL(`https://wa.me/${student.phone.replace(/\D/g, '')}`)}
              >
                WhatsApp
              </Button>
            </View>
          </View>
        ) : null}

        {/* Student note (only when captured) */}
        {trial.note ? (
          <View
            style={[
              styles.noteCard,
              { backgroundColor: theme.color.persimmonSoft, borderColor: theme.color.persimmon },
            ]}
          >
            <Text
              style={{
                fontFamily: sansFor(700),
                fontSize: 11,
                color: theme.color.persimmonDeep,
                letterSpacing: 1.4,
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              {student.name.split(' ')[0]} wrote
            </Text>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 13,
                color: theme.color.ink,
                lineHeight: 18,
              }}
            >
              {trial.note}
            </Text>
          </View>
        ) : null}

        {attended ? (
          <View style={[styles.notice, { backgroundColor: theme.color.jadeSoft, marginTop: 4 }]}>
            <IconCheck size={18} color={theme.color.jade} />
            <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.jade }}>
              Marked present
              {trial.marked_at
                ? ` · ${new Date(trial.marked_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
                : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function formatDayLabel(d: Date): string {
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingBottom: 24 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontFamily: sansFor(800), fontSize: 10.5, letterSpacing: 0.3 },
  kicker: {
    fontFamily: sansFor(700),
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#EC5A2B',
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 16,
    padding: 13,
    marginTop: 16,
  },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  noteCard: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', padding: 14, marginTop: 14 },
});
