import { ScreenHeader } from '@/components/common/ScreenHeader';
import { PayContactCard } from '@/components/pay/PayContactCard';
import { PayFooter } from '@/components/pay/PayFooter';
import { PaySummaryCard } from '@/components/pay/PaySummaryCard';
import { formatRupees } from '@/lib/format';
import { useAuth } from '@/stores/auth';
import { IconCal, IconShield, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// M4.2: coaching-specific payment step. `enrollment/pay.tsx` is off-limits
// for this slice (hardcoded to enrollment_id/enrollment_period_id and the
// enrollment confirmation route) and too enrollment-specific to reuse
// directly, so this copies the same UI shell/components
// (PaySummaryCard/PayContactCard/PayFooter, dev-mode Razorpay simulate
// fallback) wired to the coach-booking accept response instead.
//
// KNOWN GAP (not this slice's to fix — flagged, not patched): the
// CoachBookingPayment wire shape (`CoachBooking.payment` in
// backend/shared/types/src/index.ts and coaching/service.ts's `toWire()`)
// doesn't expose `razorpay_key`, so `razorpay_key` here is normally empty and
// this screen falls into the same "dev mode" simulate-payment branch other
// pay screens use when the key's missing. Separately,
// backend/api/src/modules/payments/service.ts's `handleWebhook()` has no
// lookup branch for `CoachBookingPayment` (only enrollment/event/workshop/
// trial-booking are checked), so even the dev-mode simulate call below won't
// actually mark a coach-booking payment captured until that's added.

let RazorpayCheckout: any;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  RazorpayCheckout = null;
}

export default function CoachingPayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((state) => state.user);
  const [paying, setPaying] = useState(false);

  const {
    booking_id,
    razorpay_order_id,
    razorpay_key,
    amount_paise,
    coach_name,
    mode,
    proposed_at,
  } = useLocalSearchParams<{
    booking_id: string;
    razorpay_order_id: string;
    razorpay_key: string;
    amount_paise: string;
    coach_name: string;
    mode: string;
    proposed_at: string;
  }>();

  const amountNum = Number(amount_paise ?? 0);
  const proposedDate = proposed_at ? new Date(proposed_at) : null;
  const isOnline = mode === 'online';

  const goToBooking = () => router.replace(`/coaching/${booking_id}` as any);

  const onPay = async () => {
    const isMockKey = !razorpay_key || razorpay_key === 'rzp_test_xxx';
    if (!RazorpayCheckout || isMockKey) {
      Alert.alert('Dev mode', 'Razorpay keys not configured. Simulate payment?', [
        {
          text: 'Simulate success',
          onPress: async () => {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
            try {
              const response = await fetch(`${apiUrl}/payments/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': '' },
                body: JSON.stringify({
                  event: 'payment.captured',
                  payload: {
                    payment: {
                      entity: {
                        order_id: razorpay_order_id,
                        id: `pay_dev_${Date.now()}`,
                        notes: { coach_booking_id: booking_id, payment_type: 'coach_booking' },
                      },
                    },
                  },
                }),
              });
              if (!response.ok) {
                Alert.alert('Webhook failed', `API returned ${response.status}.`);
                return;
              }
            } catch (error: any) {
              Alert.alert(
                'Cannot reach API',
                `Webhook URL ${apiUrl} unreachable. ${error?.message ?? ''}`
              );
              return;
            }
            goToBooking();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    setPaying(true);
    try {
      const options = {
        key: razorpay_key,
        amount: String(amountNum),
        currency: 'INR',
        name: 'Findemy',
        description: `1:1 session${coach_name ? ` with ${coach_name}` : ''}`,
        order_id: razorpay_order_id,
        prefill: { contact: (user as any)?.phone ?? '', name: (user as any)?.name ?? '' },
        theme: { color: theme.color.persimmon.replace('#', '') },
      };
      await RazorpayCheckout.open(options);
      goToBooking();
    } catch (error: any) {
      Alert.alert(
        'Payment failed',
        error?.description ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="Review your session" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemRow}>
          <View style={[styles.avatar, { backgroundColor: theme.color.persimmon }]}>
            <Text style={{ color: '#fff', fontFamily: theme.font.serifItalic, fontSize: 22 }}>
              {coach_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }}
              numberOfLines={2}
            >
              {coach_name ? `1:1 with ${coach_name}` : '1:1 session'}
            </Text>
            <Text
              style={{
                fontFamily: theme.font.sansSemibold,
                fontSize: 12.5,
                color: theme.color.mist,
                marginTop: 3,
              }}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline },
          ]}
        >
          <View style={styles.dtRow}>
            <IconCal size={16} color={theme.color.persimmon} />
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>
              {proposedDate ? format(proposedDate, 'EEE, d MMM · h:mm a') : '—'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.lineRow}>
            <Text
              style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}
            >
              1 × Coaching session
            </Text>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}>
              {formatRupees(amountNum)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.dtRow}>
            <IconShield size={15} color={theme.color.mist} />
            <Text
              style={{
                fontFamily: theme.font.sansMedium,
                fontSize: 12.5,
                color: theme.color.mist,
                flex: 1,
              }}
            >
              Quoted by the academy on acceptance. Pay to lock in your session.
            </Text>
          </View>
        </View>

        <PaySummaryCard basePaise={amountNum} totalPaise={amountNum} />
        <PayContactCard />

        <Text
          style={{
            fontFamily: theme.font.sans,
            fontSize: 11.5,
            color: theme.color.mist,
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          🔒 Secure checkout · you won't be charged until confirmed.
        </Text>
      </ScrollView>

      <PayFooter totalPaise={amountNum} onPay={onPay} loading={paying} ctaLabel="Pay & confirm" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingTop: 16,
    paddingBottom: 6,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 14 },
  dtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  divider: { height: 1, marginVertical: 10 },
});
