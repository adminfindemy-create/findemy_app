import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, sansFor, tokens, Spill, IconCal, IconChevR, IconChevL } from '@findemy/ui';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  addWeeks, addMonths, addYears, format,
} from 'date-fns';
import { useStudioEarnings } from '@/hooks/useStudioQueries';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ErrorState } from '@/components/ErrorState';
import { formatRupees } from '@/lib/format';

function fmt(paise: number) {
  return formatRupees(paise).replace('₹', '');
}
function fmtBig(paise: number): string {
  const amount = Math.round(paise / 100);
  const abbr = (n: number, suffix: string) => {
    const v = Math.floor(n * 10) / 10;
    return (Number.isInteger(v) ? String(v) : v.toFixed(1)) + suffix;
  };
  if (amount >= 100000) return abbr(amount / 100000, 'L');
  if (amount >= 1000) return abbr(amount / 1000, 'k');
  return amount.toLocaleString('en-IN');
}

type Period = 'week' | 'month' | 'year';
type Cat = '' | 'trial' | 'enrollment' | 'workshop';

const PRESETS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const CATS: { key: Cat; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'trial', label: 'Trials' },
  { key: 'enrollment', label: 'Enrolments' },
  { key: 'workshop', label: 'Workshops' },
];

const CATEGORY_LABEL: Record<string, string> = { trial: 'Trials', monthly: 'Monthly', workshop: 'Workshops' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Window (start/end) + display label for a preset stepped by `offset` (0 = current, −1 = previous).
function presetWindow(period: Period, offset: number): { start: Date; end: Date; label: string } {
  const base = new Date();
  if (period === 'week') {
    const s = startOfWeek(addWeeks(base, offset), { weekStartsOn: 1 });
    const e = endOfWeek(addWeeks(base, offset), { weekStartsOn: 1 });
    return { start: s, end: e, label: `${format(s, 'd MMM')} – ${format(e, 'd MMM')}` };
  }
  if (period === 'year') {
    const s = startOfYear(addYears(base, offset));
    return { start: s, end: endOfYear(addYears(base, offset)), label: format(s, 'yyyy') };
  }
  const s = startOfMonth(addMonths(base, offset));
  return { start: s, end: endOfMonth(addMonths(base, offset)), label: format(s, 'MMMM yyyy') };
}

export default function EarningsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0); // 0 = current, negative = past
  const [cat, setCat] = useState<Cat>('');
  const [fromStr, setFromStr] = useState('');
  const [toStr, setToStr] = useState('');

  const win = presetWindow(period, offset);
  const customValid = DATE_RE.test(fromStr) && DATE_RE.test(toStr) && new Date(fromStr) <= new Date(toStr);

  // Query args: preset current period → { period }; stepped/custom → explicit { from, to }.
  const queryArgs = useMemo(() => {
    const category = cat || undefined;
    if (mode === 'custom') {
      if (!customValid) return { category }; // falls back to default month until a valid range is entered
      return { category, from: new Date(`${fromStr}T00:00:00`).toISOString(), to: new Date(`${toStr}T23:59:59`).toISOString() };
    }
    if (offset === 0) return { period, category };
    return { period, category, from: win.start.toISOString(), to: win.end.toISOString() };
  }, [mode, period, offset, cat, customValid, fromStr, toStr, win.start, win.end]);

  const { data, isLoading, isError, refetch } = useStudioEarnings(queryArgs);

  const total = data?.total_paise ?? 0;
  const delta = data?.delta_paise ?? 0;
  const periodWord = mode === 'custom' ? 'range' : period;
  const dkLabel = mode === 'custom' ? (customValid ? `${fromStr} → ${toStr}` : 'Pick a date range') : win.label;

  const prev = total - delta;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;
  const deltaLabel =
    delta === 0
      ? 'No change vs previous'
      : `${delta > 0 ? '▲' : '▼'} ${pct != null ? `${Math.abs(pct)}%` : `₹${fmt(Math.abs(delta))}`} vs previous ${periodWord}`;

  const nextPayout = data?.payouts?.[0];
  const isScheduled = !!nextPayout;
  const payoutAmount = isScheduled ? nextPayout!.amount_paise : data?.net_paise ?? total;
  const bank = nextPayout?.bank_last4 ? `${nextPayout.bank_name ?? 'Bank'} ••${nextPayout.bank_last4}` : 'Add bank in settings';

  return (
    <Screen header={<ScreenHeader title="Earnings" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {/* Period seg */}
        <View style={[styles.seg, { backgroundColor: theme.color.paperWarm }]}>
          {PRESETS.map((preset) => {
            const on = mode === 'preset' && period === preset.key;
            return (
              <Pressable
                key={preset.key}
                onPress={() => { setMode('preset'); setPeriod(preset.key); setOffset(0); }}
                style={[styles.segBtn, on && [{ backgroundColor: theme.color.ivory }, theme.shadow.sm]]}
              >
                <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: on ? theme.color.ink : theme.color.inkSoft }}>{preset.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setMode('custom')}
            style={[styles.segBtn, mode === 'custom' && [{ backgroundColor: theme.color.ivory }, theme.shadow.sm]]}
          >
            <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: mode === 'custom' ? theme.color.ink : theme.color.inkSoft }}>Custom</Text>
          </Pressable>
        </View>

        {/* Stepper (preset) or date-range inputs (custom) */}
        {mode === 'preset' ? (
          <View style={styles.stepper}>
            <Pressable onPress={() => setOffset((prev) => prev - 1)} hitSlop={8} style={[styles.stepBtn, { borderColor: theme.color.hairline }]}>
              <IconChevL size={18} color={theme.color.ink} />
            </Pressable>
            <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }}>{win.label}</Text>
            <Pressable
              onPress={() => setOffset((prev) => Math.min(0, prev + 1))}
              disabled={offset === 0}
              hitSlop={8}
              style={[styles.stepBtn, { borderColor: theme.color.hairline, opacity: offset === 0 ? 0.35 : 1 }]}
            >
              <IconChevR size={18} color={theme.color.ink} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.rangeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLbl}>From</Text>
              <TextInput
                value={fromStr}
                onChangeText={setFromStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.color.mist}
                style={[styles.rangeInput, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, color: theme.color.ink }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLbl}>To</Text>
              <TextInput
                value={toStr}
                onChangeText={setToStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.color.mist}
                style={[styles.rangeInput, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, color: theme.color.ink }]}
              />
            </View>
          </View>
        )}

        {/* Category filter chips */}
        <View style={styles.chips}>
          {CATS.map((catOption) => {
            const on = cat === catOption.key;
            return (
              <Pressable
                key={catOption.key || 'all'}
                onPress={() => setCat(catOption.key)}
                style={[styles.chip, { backgroundColor: on ? theme.color.ink : theme.color.ivory, borderColor: on ? theme.color.ink : theme.color.hairline }]}
              >
                <Text style={{ fontFamily: sansFor(600), fontSize: 12.5, color: on ? theme.color.ivory : theme.color.inkSoft }}>{catOption.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Dark dashboard card */}
        <View style={[styles.dash, { backgroundColor: theme.color.ink }]}>
          <View style={[styles.dcal, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <IconCal size={20} color={theme.color.persimmon} />
          </View>
          <Text style={styles.dk}>{dkLabel}</Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 40, lineHeight: 44, color: theme.color.ivory, marginTop: 2 }}>
            ₹{fmt(total)}
          </Text>
          <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: delta > 0 ? '#7BD0A0' : delta < 0 ? theme.color.roseSoft : 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            {deltaLabel}
          </Text>

          {data?.by_category && data.by_category.length > 0 ? (
            <View style={styles.drow}>
              {data.by_category.slice(0, 3).map((categoryEntry) => (
                <View key={categoryEntry.category} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.font.serif, fontSize: 19, color: theme.color.ivory }}>₹{fmtBig(categoryEntry.captured_paise)}</Text>
                  <Text style={styles.dt}>{CATEGORY_LABEL[categoryEntry.category] ?? categoryEntry.category}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
            Net ₹{fmt(data?.net_paise ?? total)} after ₹{fmt(data?.commission_paise ?? 0)} Findemy commission
          </Text>
        </View>

        {isLoading ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            <SkeletonLoader height={70} borderRadius={16} />
            <SkeletonLoader height={70} borderRadius={16} />
          </View>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <>
            {/* S7: rolling reserve + any recovery owed to Findemy */}
            {(() => {
              const settlement = (data as any)?.settlement;
              if (!settlement) return null;
              const held = settlement.reserve_held_paise ?? 0;
              const owed = settlement.outstanding_recovery_paise ?? 0;
              if (held <= 0 && owed <= 0) return null;
              return (
                <View style={{ gap: 8 }}>
                  <Text style={styles.h2}>Settlement</Text>
                  <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm, { padding: 14, gap: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }}>Reserve held</Text>
                        <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, marginTop: 2 }}>
                          10% rolling reserve, released after 60 days
                        </Text>
                      </View>
                      <Text style={{ fontFamily: theme.font.serif, fontSize: 18, color: theme.color.ink }}>₹{fmt(held)}</Text>
                    </View>
                    {owed > 0 ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.color.hairline, paddingTop: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.rose }}>Owed to Findemy</Text>
                          <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, marginTop: 2 }}>
                            From discontinuation refunds — netted from future payouts
                          </Text>
                        </View>
                        <Text style={{ fontFamily: theme.font.serif, fontSize: 18, color: theme.color.rose }}>−₹{fmt(owed)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })()}

            {data?.transactions && data.transactions.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.h2}>Recent transactions</Text>
                <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                  {data.transactions.map((transaction, index) => {
                    const out = transaction.dir === 'out';
                    const isCommission = /commission|fee/i.test(transaction.kind) || out;
                    return (
                      <View key={transaction.id} style={[styles.tx, index > 0 && { borderTopWidth: 1, borderTopColor: theme.color.hairline }]}>
                        <View style={[styles.txAv, { backgroundColor: isCommission ? theme.color.paperWarm : theme.color.persimmonSoft }]}>
                          <Text style={{ fontFamily: sansFor(800), fontSize: 13, color: isCommission ? theme.color.whisper : theme.color.persimmonDeep }}>
                            {isCommission ? '%' : '₹'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }} numberOfLines={1}>{transaction.label}</Text>
                          <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: theme.color.mist, marginTop: 1 }}>
                            {new Date(transaction.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: sansFor(800), fontSize: 15, color: out ? theme.color.rose : theme.color.jade }}>
                          {out ? '−' : '+'}₹{fmt(transaction.amount_paise)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, paddingVertical: 12 }}>
                No earnings in this period{cat ? ` for ${CATS.find((catOption) => catOption.key === cat)?.label.toLowerCase()}` : ''}.
              </Text>
            )}

            {/* Next payout */}
            <Pressable
              style={[styles.payout, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}
              onPress={() => router.push('/(tabs)/settings' as never)}
            >
              <View style={[styles.payoutAv, { backgroundColor: theme.color.ink }]}>
                <IconCal size={18} color={theme.color.ivory} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }}>
                  {isScheduled
                    ? `Next payout${nextPayout!.paid_at ? ` · ${new Date(nextPayout!.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`
                    : 'Estimated payout'}
                </Text>
                <Text style={{ fontFamily: sansFor(600), fontSize: 12, color: theme.color.mist, marginTop: 2 }}>{bank} · ₹{fmt(payoutAmount)}</Text>
              </View>
              <IconChevR size={18} color={theme.color.whisper} />
            </Pressable>

            {data?.by_batch && data.by_batch.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.h2}>By batch</Text>
                {data.by_batch.map((batchEarning) => (
                  <View key={batchEarning.batch_id} style={[styles.row, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
                    <View style={[styles.rowIcon, { backgroundColor: theme.color.jadeSoft }]}>
                      <Text style={{ fontFamily: sansFor(800), fontSize: 14, color: theme.color.jade }}>₹</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }} numberOfLines={1}>{batchEarning.batch_title}</Text>
                      <Text style={{ fontFamily: sansFor(600), fontSize: 11.5, color: theme.color.mist, marginTop: 1 }}>{batchEarning.count} bookings</Text>
                    </View>
                    <Text style={{ fontFamily: theme.font.serif, fontSize: 18, color: theme.color.ink }}>₹{fmt(batchEarning.net_paise)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data?.payouts && data.payouts.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.h2}>Payouts</Text>
                <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
                  {data.payouts.map((payout, index) => (
                    <View key={payout.id} style={[styles.tx, index > 0 && { borderTopWidth: 1, borderTopColor: theme.color.hairline }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: sansFor(700), fontSize: 13.5, color: theme.color.ink }}>Payout #{payout.id.slice(0, 6)}</Text>
                        <View style={{ marginTop: 3, alignSelf: 'flex-start' }}>
                          <Spill state={payout.status} />
                        </View>
                      </View>
                      <Text style={{ fontFamily: theme.font.serif, fontSize: 16, color: theme.color.jade }}>₹{fmt(payout.amount_paise)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, gap: 14, paddingBottom: 8 },
  seg: { flexDirection: 'row', gap: 4, borderRadius: 999, padding: 5 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  stepBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeLbl: { fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#8A8071', marginBottom: 6 },
  rangeInput: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, fontSize: 14, fontFamily: sansFor(400) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  dash: { borderRadius: 22, padding: 18, overflow: 'hidden' },
  dcal: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dk: { fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' },
  drow: { flexDirection: 'row', gap: 16, marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12 },
  dt: { fontFamily: sansFor(700), fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  h2: { fontFamily: tokens.font.serif, fontSize: 20, color: '#1A1611' },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  txAv: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  payout: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, borderWidth: 1, padding: 14 },
  payoutAv: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, paddingHorizontal: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
