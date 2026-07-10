import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useTheme, sansFor, Summary, SummaryRow, Button, SectionHeader, Spill, IconUsers, IconCheck } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useStudioStudent } from '@/hooks/useStudioQueries';
import { ErrorState } from '@/components/ErrorState';
import { TierBadge } from '@/components/TierBadge';
import { format } from 'date-fns';

function money(paise?: number): string {
  if (paise == null) return '—';
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export default function StudentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { data, isLoading, isError, refetch } = useStudioStudent(id);

  if (isError) {
    return (
      <Screen header={<ScreenHeader title="Student" showBack />} bottomTab={null}>
        <ErrorState message="Couldn't load this student." onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading || !data) {
    return (
      <Screen header={<ScreenHeader title="Student" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>Loading…</Text>
      </Screen>
    );
  }

  const { student, enrollments, trial_history, attendance_history } = data as any;
  const activeEnrollments = (enrollments ?? []).filter((enrollment: any) => enrollment.status === 'active');
  const primary = activeEnrollments[0] ?? enrollments?.[0];

  const initial = student.name?.[0]?.toUpperCase() ?? '?';
  const batchLine = activeEnrollments.length
    ? activeEnrollments.map((enrollment: any) => enrollment.batch_title).join(', ')
    : (enrollments?.[0]?.batch_title ?? 'No active batch');
  const sinceDate = primary?.started_at ? new Date(primary.started_at) : null;
  const sinceValid = sinceDate && !isNaN(sinceDate.getTime());
  const renewEnd = primary?.current_period_end ? new Date(primary.current_period_end) : null;
  const renewValid = renewEnd && !isNaN(renewEnd.getTime());
  const planValue = primary
    ? `${money(primary.monthly_fee_paise)}/mo${renewValid ? ` · renews ${format(renewEnd!, 'd MMM')}` : ''}`
    : 'No active plan';

  const openWhatsApp = () => {
    if (!student.phone) return;
    const msg = encodeURIComponent(`Hi ${student.name}, this is a reminder for your upcoming class. See you soon!`);
    Linking.openURL(`https://wa.me/${student.phone.replace(/\D/g, '')}?text=${msg}`);
  };

  return (
    <Screen header={<ScreenHeader title="Student" showBack />} bottomTab={null} scroll>
      <View style={styles.container}>
        {/* Profile */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <View style={[styles.av, { backgroundColor: theme.color.persimmon }]}>
            <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 24, color: theme.color.ivory }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 26, lineHeight: 28, color: theme.color.ink }}>
              {student.name}
            </Text>
            <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.mist, marginTop: 3 }}>
              {sinceValid
                ? `Enrolled ${format(sinceDate!, 'MMM yyyy')}`
                : [student.age ? `${student.age} yrs` : null, student.location].filter(Boolean).join(' · ') || 'Student'}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <Summary>
          <SummaryRow icon={<IconUsers size={16} color={theme.color.persimmonDeep} />} label="Batch" value={batchLine} />
          <SummaryRow
            icon={<Text style={{ fontFamily: theme.font.serif, fontSize: 15, color: theme.color.persimmonDeep }}>₹</Text>}
            label="Plan"
            value={planValue}
          />
          <SummaryRow
            icon={<IconCheck size={16} color={theme.color.persimmonDeep} />}
            label="Attendance"
            last
            value={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>
                  {student.attendance_pct != null ? `${student.attendance_pct}% this term` : 'Not scored yet'}
                </Text>
                <TierBadge tier={student.tier} />
              </View>
            }
          />
        </Summary>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Button variant="ghost" block style={{ flex: 1 }} onPress={openWhatsApp}>
            Message
          </Button>
          {primary?.batch_id ? (
            <Button variant="dark" block style={{ flex: 1 }} onPress={() => router.push(`/batches/${primary.batch_id}` as any)}>
              View batch
            </Button>
          ) : null}
        </View>

        {/* Trial history */}
        {trial_history && trial_history.length > 0 ? (
          <>
            <SectionHeader title="Trial history" />
            <View style={{ gap: 8 }}>
              {trial_history.map((trial: any) => (
                <View key={trial.id} style={[styles.miniRow, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: sansFor(600), fontSize: 14, color: theme.color.ink }}>{trial.batch_title}</Text>
                    <Text style={{ fontFamily: sansFor(500), fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
                      {format(new Date(trial.trial_at), 'd MMM yyyy')}
                    </Text>
                  </View>
                  <Spill state={trial.status} />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Attendance history */}
        {attendance_history && attendance_history.length > 0 ? (
          <>
            <SectionHeader title="Recent attendance" />
            <View style={styles.attGrid}>
              {(attendance_history as any[]).slice(0, 20).map((record: any, index: number) => (
                <View key={index} style={[styles.attDot, { backgroundColor: record.present ? theme.color.jade : theme.color.rose }]} />
              ))}
            </View>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.mist, marginTop: 6 }}>
              Last 20 classes · green = present, red = absent
            </Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    gap: 8,
  },
  av: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  attGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  attDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
