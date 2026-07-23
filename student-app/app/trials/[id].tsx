import { CancelSheet, type CancelSheetTarget } from '@/components/booking/CancelSheet';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useCancelBooking } from '@/hooks/useBookings';
import { useEnrollBatch, useEnrollmentStatus } from '@/hooks/useEnroll';
import { useTrial } from '@/hooks/useTrials';
import { useAuth } from '@/stores/auth';
import {
  AttendanceCodeCard,
  BlockPrintCover,
  Button,
  IconCal,
  IconMappin,
  IconUser,
  MenuRow,
  SectionLabel,
  StatusBanner,
  Summary,
  SummaryRow,
  useTheme,
} from '@findemy/ui';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG);
  else Alert.alert('', message);
}

function inr(paise?: number | null): string {
  const rupees = Math.round((paise ?? 0) / 100);
  const rupeesStr = String(rupees);
  if (rupeesStr.length <= 3) return `₹${rupeesStr}`;
  const last3 = rupeesStr.slice(-3);
  const rest = rupeesStr.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest},${last3}`;
}

export default function TrialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useTrial(id);
  const cancelBooking = useCancelBooking();
  const attendanceOtp = useAuth((state) => state.attendanceOtp);
  const trial = data?.trial as any;
  const batchId = trial?.batch_id ?? trial?.batchId ?? '';
  const enrollStatus = useEnrollmentStatus(batchId);
  const enrollBatch = useEnrollBatch();
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
        <ScreenHeader title="Booking details" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.color.persimmon} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trial) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
        <ScreenHeader title="Booking details" />
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const trialAt = trial.trial_at ?? trial.trialAt ?? trial.scheduled_at;
  const trialDate = trialAt ? new Date(trialAt) : null;
  const isPast = trialDate ? trialDate < new Date() : false;
  const status = (trial.status ?? '').toLowerCase();
  const isCancelled = status === 'cancelled' || trial.booking_status === 'cancelled';
  const isAttended = status === 'attended';
  const isUpcoming = !isPast && !isCancelled;
  const online = trial.mode === 'online';
  const category = trial.category ?? 'music';

  const trialAmountPaise =
    trial.payment_status === 'captured'
      ? (trial.payment_amount_paise ?? trial.trial_fee_paise ?? 0)
      : (trial.trial_fee_paise ?? 0);
  const rescheduleCount = trial.reschedule_count ?? 0;
  const canReview = isPast && !isCancelled && status !== 'attended';
  const otp = (attendanceOtp ?? trial.attendance_code ?? '').toString();
  const bookingId = trial.booking_id ?? trial.bookingId ?? trial.order_id ?? id;
  const bookedOn = trial.created_at ?? trial.createdAt;

  const cancelTarget: CancelSheetTarget | null = trialDate
    ? {
        title: trial.batch_title,
        subtitle: trial.academy_name,
        whenLabel: format(trialDate, 'EEE, d MMM · h:mm a'),
        scheduledAt: trialDate,
        amountPaise: trialAmountPaise,
        rescheduled: rescheduleCount > 0,
      }
    : null;

  const handleConfirmCancel = async ({
    acknowledgeNoRefund,
    reason,
  }: { acknowledgeNoRefund: boolean; reason?: string }) => {
    try {
      const response = await cancelBooking.mutateAsync({
        id: bookingId,
        acknowledgeNoRefund,
        reason,
      });
      setCancelSheetOpen(false);
      toast(
        response.refund_initiated
          ? `Trial cancelled — refund of ${inr(response.refund_amount_paise)} initiated.`
          : 'Trial cancelled.'
      );
      router.replace('/bookings');
    } catch (error: any) {
      Alert.alert("Couldn't cancel", error?.message ?? 'Please try again.');
    }
  };

  const handleReschedule = () => {
    if (!bookingId) return Alert.alert('Reschedule', 'Booking reference missing.');
    router.push(`/booking/slot?batch_id=${batchId}&reschedule_booking_id=${bookingId}` as any);
  };

  const handleDirections = () => {
    const address = encodeURIComponent(trial.academy_address ?? trial.academy_name ?? '');
    Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${address}` : `geo:0,0?q=${address}`).catch(
      () => Linking.openURL(`https://maps.google.com/?q=${address}`)
    );
  };

  const handleJoinBatch = async () => {
    try {
      const result = await enrollBatch.mutateAsync({ batchId, package_type: 'monthly' });
      if (result.requires_payment) {
        router.push(
          `/enrollment/pay?enrollment_period_id=${result.enrollment_period_id}&razorpay_order_id=${result.razorpay_order_id}&razorpay_key=${result.razorpay_key}&amount_paise=${result.amount_paise}&batch_title=${encodeURIComponent(trial.batch_title ?? '')}&package_type=monthly&flow=enroll` as any
        );
      } else {
        Alert.alert('Enrolled!', "You've joined this batch. Find it under My Classes.");
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not enroll');
    }
  };

  const banner: { tone: 'jade' | 'gold' | 'rose' | 'neutral'; text: string } = isCancelled
    ? { tone: 'rose', text: 'This booking was cancelled.' }
    : isPast
      ? { tone: 'neutral', text: 'This session is completed.' }
      : { tone: 'jade', text: 'Your session is confirmed — see you soon!' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="Booking details" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Read-only booking card */}
        <View
          style={[
            styles.card,
            { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
          ]}
        >
          <BlockPrintCover
            category={category as any}
            variant={1}
            height={66}
            hideLetter
            style={styles.thumb}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }}
              numberOfLines={1}
            >
              {trial.batch_title}
            </Text>
            <View style={styles.subRow}>
              <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
                <Text style={[styles.badgeText, { color: theme.color.jade }]}>TRIAL</Text>
              </View>
              <Text
                style={{
                  fontFamily: theme.font.sansMedium,
                  fontSize: 12.5,
                  color: theme.color.mist,
                }}
                numberOfLines={1}
              >
                {trialDate ? format(trialDate, 'EEE d MMM · h:mm a') : ''}
              </Text>
            </View>
            <View style={styles.foot}>
              <Text
                style={{
                  fontFamily: theme.font.sansMedium,
                  fontSize: 12.5,
                  color: theme.color.mist,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {trial.academy_name ?? ''}
              </Text>
              {trialAmountPaise > 0 ? (
                <Text
                  style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}
                >
                  {inr(trialAmountPaise)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Banner */}
        <StatusBanner tone={banner.tone}>{banner.text}</StatusBanner>

        {/* Attendance code */}
        {isUpcoming && otp ? (
          <AttendanceCodeCard code={otp} hint="Show to your instructor · active 15 min before" />
        ) : null}

        {/* Session details */}
        <SectionLabel>Session details</SectionLabel>
        <Summary>
          <SummaryRow
            icon={<IconCal size={18} color={theme.color.persimmon} />}
            label="When"
            value={trialDate ? format(trialDate, 'EEE, d MMM · h:mm a') : '—'}
            last={online && !trial.coach_name}
          />
          {trial.coach_name ? (
            <SummaryRow
              icon={<IconUser size={18} color={theme.color.persimmon} />}
              label="Coach"
              value={trial.coach_name}
              last={online}
            />
          ) : null}
          {online ? (
            <SummaryRow
              icon={<IconMappin size={18} color={theme.color.persimmon} />}
              label="Mode"
              value="Online · link active 10 min before"
              last
            />
          ) : (
            <>
              <SummaryRow
                icon={<IconMappin size={18} color={theme.color.persimmon} />}
                label="Venue"
                value={trial.academy_name ?? '—'}
              />
              <SummaryRow
                icon={<IconMappin size={18} color={theme.color.persimmon} />}
                label="Address"
                value={trial.academy_address ?? '—'}
                last
              />
            </>
          )}
        </Summary>

        {/* Directions / Join */}
        {isUpcoming ? (
          online ? (
            <View style={{ marginTop: 14 }}>
              <Button
                variant="jade"
                block
                onPress={() =>
                  Alert.alert(
                    'Online session',
                    'Your join link becomes active 10 minutes before the session.'
                  )
                }
              >
                Join now
              </Button>
            </View>
          ) : (
            <View style={{ marginTop: 14 }}>
              <Button variant="ghost" block onPress={handleDirections}>
                Get directions
              </Button>
            </View>
          )
        ) : null}

        {/* Order details */}
        <SectionLabel>Order details</SectionLabel>
        <View
          style={[
            styles.ordCard,
            { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
          ]}
        >
          <OrdRow label="Item" value={trial.batch_title ?? 'Trial'} theme={theme} />
          <OrdRow
            label="Amount paid"
            value={trialAmountPaise > 0 ? inr(trialAmountPaise) : 'Free'}
            theme={theme}
          />
          {trial.payment_status === 'captured' ? (
            <OrdRow label="Payment method" value="UPI · Razorpay" theme={theme} />
          ) : null}
          <OrdRow label="Order ID" value={String(bookingId)} theme={theme} />
          {bookedOn ? (
            <OrdRow
              label="Booked on"
              value={format(new Date(bookedOn), 'd MMM yyyy')}
              theme={theme}
              last
            />
          ) : null}
        </View>

        {trial.refund_status ? (
          <Text
            style={{
              fontFamily: theme.font.sansMedium,
              fontSize: 12.5,
              marginTop: 10,
              color:
                trial.refund_status === 'processed'
                  ? theme.color.jade
                  : trial.refund_status === 'failed'
                    ? theme.color.rose
                    : theme.color.marigold,
            }}
          >
            {trial.refund_status === 'processed'
              ? 'Refund processed'
              : trial.refund_status === 'failed'
                ? 'Refund failed — contact support'
                : 'Refund processing'}
          </Text>
        ) : null}

        {/* Post-attendance: enrol */}
        {isAttended ? (
          enrollStatus.data?.enrolled ? (
            <View style={[styles.enrolled, { backgroundColor: theme.color.jadeSoft }]}>
              <Text
                style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.jade }}
              >
                ✓ Enrolled in this batch
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Button block onPress={handleJoinBatch} loading={enrollBatch.isPending}>
                Join this batch
              </Button>
            </View>
          )
        ) : null}

        {/* Review */}
        {canReview ? (
          <View style={{ marginTop: 12 }}>
            <Button
              block
              onPress={() =>
                router.push(
                  `/post-trial?trialId=${id}&batchTitle=${encodeURIComponent(trial.batch_title ?? '')}&academyId=${trial.academy_id ?? trial.academyId ?? ''}&academyName=${encodeURIComponent(trial.academy_name ?? '')}` as any
                )
              }
            >
              Leave a review
            </Button>
          </View>
        ) : null}

        {/* Manage booking (upcoming) */}
        {isUpcoming ? (
          <>
            <SectionLabel>Manage booking</SectionLabel>
            <MenuRow
              title="Reschedule"
              sub="Move to another date or time"
              onPress={handleReschedule}
            />
            <MenuRow
              title="Cancel trial"
              sub="Free cancellation up to 12h before"
              tone="rose"
              disabled={cancelBooking.isPending}
              onPress={() => setCancelSheetOpen(true)}
            />
          </>
        ) : null}

        {/* Support */}
        <SectionLabel>Support</SectionLabel>
        <MenuRow
          title="Need help with this booking"
          sub="Refunds, reschedules & issues"
          onPress={() => toast('Opening help centre…')}
        />
        <MenuRow
          title="Chat with support"
          sub="Typically replies in a few minutes"
          onPress={() => toast('Connecting you to support…')}
        />
        <MenuRow
          title="Terms & conditions"
          sub="Cancellation & refund policy"
          onPress={() => router.push('/profile/general-info' as any)}
        />
      </ScrollView>

      <CancelSheet
        visible={cancelSheetOpen}
        kind="trial"
        target={cancelTarget}
        onClose={() => setCancelSheetOpen(false)}
        onConfirm={handleConfirmCancel}
        submitting={cancelBooking.isPending}
      />
    </SafeAreaView>
  );
}

function OrdRow({
  label,
  value,
  theme,
  last,
}: { label: string; value: string; theme: any; last?: boolean }) {
  return (
    <View
      style={[
        styles.ordRow,
        { borderBottomColor: theme.color.hairline, borderBottomWidth: last ? 0 : 1 },
      ]}
    >
      <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.color.mist }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: theme.font.sansBold,
          fontSize: 13.5,
          color: theme.color.ink,
          flex: 1,
          textAlign: 'right',
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginTop: 4,
  },
  thumb: { width: 66, height: 66, borderRadius: 15, overflow: 'hidden' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ordCard: { borderWidth: 1, borderRadius: 20, padding: 16 },
  ordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
  },
  enrolled: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
});
