import { formatRupees } from '@/lib/format';
import { useTheme } from '@findemy/ui';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SectionRule } from './SectionRule';

// Payment-summary card: Order amount / Fees & charges / Grand total.
export function PaySummaryCard({
  basePaise,
  totalPaise,
  loading,
  orderLabel = 'Order amount',
}: {
  basePaise?: number | null;
  totalPaise?: number | null;
  loading?: boolean;
  orderLabel?: string;
}) {
  const theme = useTheme();
  const base = basePaise ?? totalPaise ?? null;
  const total = totalPaise ?? basePaise ?? null;
  const fee = base != null && total != null ? total - base : 0;

  return (
    <>
      <SectionRule label="PAYMENT SUMMARY" />
      <View
        style={[
          styles.card,
          { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline },
        ]}
      >
        <View style={styles.line}>
          <Text
            style={[styles.k, { color: theme.color.inkSoft, fontFamily: theme.font.sansSemibold }]}
          >
            {orderLabel}
          </Text>
          <Text style={[styles.v, { color: theme.color.ink, fontFamily: theme.font.sansSemibold }]}>
            {base != null ? formatRupees(base) : '—'}
          </Text>
        </View>
        <View style={styles.line}>
          <Text
            style={[styles.k, { color: theme.color.inkSoft, fontFamily: theme.font.sansSemibold }]}
          >
            Fees &amp; charges
          </Text>
          <Text style={[styles.v, { color: theme.color.ink, fontFamily: theme.font.sansSemibold }]}>
            {formatRupees(fee)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
        <View style={styles.line}>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>
            Grand total
          </Text>
          {loading ? (
            <ActivityIndicator color={theme.color.persimmon} />
          ) : (
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 17, color: theme.color.ink }}>
              {total != null ? formatRupees(total) : '—'}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  k: { fontSize: 14 },
  v: { fontSize: 14 },
  divider: { height: 1, marginVertical: 10 },
});
