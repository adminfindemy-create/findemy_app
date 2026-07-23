import { BottomSheet } from '@/components/common/BottomSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useMyPayments, usePaymentReceipt } from '@/hooks/usePayments';
import { formatRupees } from '@/lib/format';
import { Button, Summary, SummaryRow, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentItem = {
  id: string;
  batch_title: string;
  academy_name: string;
  package_type: string;
  amount_paise: number;
  status: string;
  paid_at: string;
  refund_status: string | null;
  refund_amount_paise: number | null;
};

function statusConfig(theme: ReturnType<typeof useTheme>, status: string) {
  switch (status) {
    case 'captured':
      return { label: 'Paid', bg: theme.color.jadeSoft, fg: theme.color.jade };
    case 'refunded':
      return {
        label: 'Refunded',
        bg: theme.color.marigoldSoft,
        fg: theme.color.marigold,
      };
    case 'failed':
      return {
        label: 'Failed',
        bg: theme.color.roseSoft,
        fg: theme.color.rose,
      };
    default:
      return { label: 'Pending', bg: theme.color.bone, fg: theme.color.mist };
  }
}

function PaymentRow({ payment, onPress }: { payment: PaymentItem; onPress: () => void }) {
  const theme = useTheme();
  const badge = statusConfig(theme, payment.status);
  const canViewReceipt = payment.status === 'captured';
  return (
    <Pressable
      onPress={canViewReceipt ? onPress : undefined}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: '#fff',
          borderColor: theme.color.hairline,
          ...theme.shadow.sm,
        },
        pressed && canViewReceipt && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.title, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}
          numberOfLines={1}
        >
          {payment.batch_title}
        </Text>
        <Text
          style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]}
          numberOfLines={1}
        >
          {`${payment.academy_name} · ${format(new Date(payment.paid_at), 'd MMM yyyy')}`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.amount, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>
          {formatRupees(payment.amount_paise)}
        </Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { fontFamily: theme.font.sansBold, color: badge.fg }]}>
            {badge.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function ReceiptSheet({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const receiptQ = usePaymentReceipt(paymentId);
  const receipt = receiptQ.data?.receipt;

  const handleShare = () => {
    if (!receipt) return;
    const refLine = receipt.razorpay_payment_id ? `Ref: ${receipt.razorpay_payment_id}` : '';
    Share.share({
      message: `Findemy receipt ${receipt.receipt_number}\n${receipt.batch_title} · ${receipt.academy_name}\n${receipt.package_type} (${receipt.period_start} – ${receipt.period_end})\nAmount: ${formatRupees(receipt.amount_paise)}\nPaid: ${format(new Date(receipt.paid_at), 'd MMMM yyyy')}\n${refLine}`,
    });
  };

  return (
    <BottomSheet visible={!!paymentId} onClose={onClose}>
      <View style={styles.sheetTitleRow}>
        <Text
          style={{
            fontFamily: theme.font.serifItalic,
            fontSize: 26,
            color: theme.color.ink,
          }}
        >
          Receipt
        </Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close receipt">
          <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
        </Pressable>
      </View>

      {receiptQ.isLoading ? (
        <View style={{ gap: 12 }}>
          <SkeletonLoader height={22} width="60%" borderRadius={6} />
          <SkeletonLoader height={140} borderRadius={20} />
        </View>
      ) : receiptQ.error ? (
        <ErrorState code={(receiptQ.error as any)?.code} onRetry={receiptQ.refetch} />
      ) : receipt ? (
        <>
          <Text
            style={[
              styles.receiptNo,
              { fontFamily: theme.font.sansBold, color: theme.color.whisper },
            ]}
          >
            {receipt.receipt_number}
          </Text>
          <Summary style={{ marginTop: 12 }}>
            <SummaryRow label="Class" value={receipt.batch_title} />
            <SummaryRow label="Academy" value={receipt.academy_name} />
            <SummaryRow
              label="Plan"
              value={`${receipt.package_type} · ${receipt.period_start} – ${receipt.period_end}`}
            />
            <SummaryRow label="Paid on" value={format(new Date(receipt.paid_at), 'd MMMM yyyy')} />
            <SummaryRow
              label="Amount"
              value={formatRupees(receipt.amount_paise)}
              last={!receipt.razorpay_payment_id}
            />
            {receipt.razorpay_payment_id ? (
              <SummaryRow label="Reference" value={receipt.razorpay_payment_id} last />
            ) : null}
          </Summary>
          <View style={{ marginTop: 18 }}>
            <Button block onPress={handleShare}>
              Share / download receipt
            </Button>
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}

export default function PaymentsScreen() {
  const theme = useTheme();
  const paymentsQ = useMyPayments();
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);

  const items = (paymentsQ.data as any)?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScreenHeader title="Payment history" />

      {paymentsQ.isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <SkeletonLoader height={78} borderRadius={16} />
          <SkeletonLoader height={78} borderRadius={16} />
          <SkeletonLoader height={78} borderRadius={16} />
        </View>
      ) : paymentsQ.error ? (
        <ErrorState code={(paymentsQ.error as any)?.code} onRetry={paymentsQ.refetch} />
      ) : items.length === 0 ? (
        <EmptyState message="No payments yet. Fees for your enrolled classes will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 60,
          }}
          showsVerticalScrollIndicator={false}
        >
          {items.map((payment: PaymentItem) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              onPress={() => setOpenReceiptId(payment.id)}
            />
          ))}
        </ScrollView>
      )}

      <ReceiptSheet paymentId={openReceiptId} onClose={() => setOpenReceiptId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 15, letterSpacing: -0.1 },
  sub: { fontSize: 12, marginTop: 3 },
  amount: { fontSize: 15 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  sheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  receiptNo: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
