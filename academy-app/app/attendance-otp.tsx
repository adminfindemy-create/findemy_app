import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useMarkAttendance, useMarkNoShow, useStudioTrial } from '@/hooks/useStudioQueries';
import { Button, OTPInput, Spill, sansFor, useTheme } from '@findemy/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type Stage =
  | { stage: 'entry'; code: string; attempts: number }
  | { stage: 'submitting'; code: string }
  | { stage: 'success' };

export default function AttendanceOtpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { trialId: trialIdParam, studentName: studentNameParam } = useLocalSearchParams<{
    trialId: string | string[];
    studentName: string | string[];
  }>();
  const trialId = Array.isArray(trialIdParam) ? trialIdParam[0] : trialIdParam;
  const studentName = Array.isArray(studentNameParam) ? studentNameParam[0] : studentNameParam;
  const [state, setState] = useState<Stage>({ stage: 'entry', code: '', attempts: 0 });
  const mark = useMarkAttendance();
  const noShow = useMarkNoShow();
  const { data: trialData } = useStudioTrial(trialId);
  const trial = trialData?.trial;

  const onNoShow = () => {
    Alert.alert(
      'Mark as no-show?',
      `${studentName || 'This student'} didn't attend. This marks the trial as missed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark no-show',
          style: 'destructive',
          onPress: async () => {
            try {
              await noShow.mutateAsync(trialId);
              router.replace('/(tabs)/inbox');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark no-show');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    setState({ stage: 'entry', code: '', attempts: 0 });
  }, [trialId]);

  const onChange = (code: string) => {
    if (state.stage !== 'entry') return;
    setState({ ...state, code });
  };

  const onSubmit = async () => {
    if (state.stage !== 'entry' || state.code.length !== 4) return;
    setState({ stage: 'submitting', code: state.code });
    try {
      await mark.mutateAsync({ id: trialId, otp_code: state.code });
      setState({ stage: 'success' });
      setTimeout(() => router.replace('/(tabs)/inbox'), 1500);
    } catch (error: any) {
      const nextAttempts = state.attempts + 1;
      if (error.code === 'OTP_MISMATCH') {
        // The client doesn't enforce a lockout — the server returns RATE_LIMITED
        // when the limit is hit — so don't promise a specific number of tries left.
        setState({ stage: 'entry', code: '', attempts: nextAttempts });
        Alert.alert('Error', 'Wrong code. Try again.');
      } else if (error.code === 'RATE_LIMITED') {
        Alert.alert('Error', 'Too many attempts. Try again in 10 minutes.');
        setState({ stage: 'entry', code: '', attempts: nextAttempts });
      } else {
        Alert.alert('Error', error.message || 'Something went wrong');
        setState({ stage: 'entry', code: state.code, attempts: nextAttempts });
      }
    }
  };

  if (state.stage === 'success') {
    return (
      <Screen header={<ScreenHeader title="Verify attendance" showBack />} bottomTab={null}>
        <View style={[styles.center, { backgroundColor: theme.color.paperWarm }]}>
          <Text style={{ fontSize: 48, color: theme.color.jade }}>✓</Text>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 24,
              color: theme.color.ink,
              marginTop: 16,
            }}
          >
            Attendance marked
          </Text>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 14,
              color: theme.color.mist,
              marginTop: 4,
              textAlign: 'center',
              paddingHorizontal: 24,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {studentName}
          </Text>
          <View style={{ marginTop: 24 }}>
            <Button onPress={() => router.replace('/(tabs)/inbox')}>Back to inbox</Button>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={<ScreenHeader title="Attendance" showBack />} bottomTab={null}>
      <View style={styles.container}>
        {/* Session recap */}
        {trial ? (
          <View
            style={[
              styles.recap,
              { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline },
            ]}
          >
            <View style={[styles.recapAv, { backgroundColor: theme.color.persimmon }]}>
              <Text
                style={{
                  fontFamily: theme.font.serifItalic,
                  fontSize: 18,
                  color: theme.color.ivory,
                }}
              >
                {(studentName || '?')[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: sansFor(700), fontSize: 14.5, color: theme.color.ink }}>
                {studentName}
              </Text>
              <Text
                style={{
                  fontFamily: sansFor(600),
                  fontSize: 12.5,
                  color: theme.color.mist,
                  marginTop: 2,
                }}
              >
                {['Trial', trial.batch_title, trial.batch_level].filter(Boolean).join(' · ')}
                {trial.scheduled_at
                  ? ` · ${new Date(trial.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
                  : ''}
              </Text>
            </View>
            <Spill state="now" />
          </View>
        ) : null}

        <Text style={[styles.sub, { color: theme.color.inkSoft, fontFamily: theme.font.sans }]}>
          Ask the student for the 4-digit code in their app and enter it to confirm they attended.
        </Text>

        <OTPInput
          value={state.stage === 'entry' ? state.code : ''}
          onChange={onChange}
          autoFocus
          length={4}
        />

        <View style={{ height: 24 }} />
        <Button
          variant="jade"
          onPress={onSubmit}
          block
          loading={state.stage === 'submitting'}
          disabled={state.stage === 'entry' ? state.code.length !== 4 : true}
          accessibilityHint="Confirms attendance for the student"
        >
          Verify & mark present
        </Button>

        <Pressable onPress={onNoShow} style={{ marginTop: 18 }} disabled={noShow.isPending}>
          <Text
            style={{
              textAlign: 'center',
              color: theme.color.rose,
              fontFamily: sansFor(700),
              fontSize: 13,
            }}
          >
            {noShow.isPending ? 'Marking…' : "Couldn't verify · mark no-show"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  recapAv: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
});
