import React from 'react';
import { View, Text, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { useTheme, sansFor, Button, IconChevR } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { useStudioSettings, useUpdateStudioSettings } from '@/hooks/useStudioQueries';
import { Screen, ScreenHeader } from '@/components/Screen';
import type { Settings } from '@findemy/types';
import { useToast } from '@/components/Toast';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { clear } = useAuth();
  const { data } = useStudioSettings();
  const update = useUpdateStudioSettings();
  const { show: showToast } = useToast();
  const settings = data?.settings as Settings | undefined;
  const n = settings?.notifications;

  const onSettingsError = () => showToast('Could not save setting', 'error');
  const setNotif = (group: 'new_trial' | 'classes' | 'reviews_activity' | 'quiet_hours', key: string, value: boolean) => {
    update.mutate({ notifications: { [group]: { [key]: value } } } as any, { onError: onSettingsError });
  };
  const setPrivacy = (value: boolean) =>
    update.mutate({ privacy: { show_phone: value } } as any, { onError: onSettingsError });

  const SectionLabel = ({ children }: { children: string }) => (
    <Text style={[styles.sectionLabel, { color: theme.color.whisper }]}>{children}</Text>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
      {children}
    </View>
  );

  const Row = ({ label, sub, value, onChange, last }: {
    label: string;
    sub?: string;
    value: boolean;
    onChange: (v: boolean) => void;
    last?: boolean;
  }) => (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.color.hairline }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: sansFor(600), fontSize: 14, color: theme.color.ink }}>{label}</Text>
        {sub ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={update.isPending}
        trackColor={{ false: theme.color.hairline, true: theme.color.jade }}
        thumbColor="#fff"
        ios_backgroundColor={theme.color.hairline}
      />
    </View>
  );

  return (
    <Screen header={<ScreenHeader title="Settings" showBack />} bottomTab="settings" scroll>
      <View style={{ paddingTop: 8, paddingBottom: 16 }}>
        <SectionLabel>New trial alerts</SectionLabel>
        <Card>
          <Row label="Push" value={n?.new_trial?.push ?? true} onChange={(v) => setNotif('new_trial', 'push', v)} />
          <Row label="WhatsApp" sub={settings?.contact?.whatsapp} value={n?.new_trial?.whatsapp ?? false} onChange={(v) => setNotif('new_trial', 'whatsapp', v)} />
          <Row label="Email" sub={settings?.contact?.email} value={n?.new_trial?.email ?? false} onChange={(v) => setNotif('new_trial', 'email', v)} last />
        </Card>

        <SectionLabel>Classes</SectionLabel>
        <Card>
          <Row label="Reminder 30 min before" value={n?.classes?.reminder_30min ?? true} onChange={(v) => setNotif('classes', 'reminder_30min', v)} />
          <Row label="Attendance reminder" value={n?.classes?.attendance_reminder ?? true} onChange={(v) => setNotif('classes', 'attendance_reminder', v)} last />
        </Card>

        <SectionLabel>Reviews & activity</SectionLabel>
        <Card>
          <Row label="New review" value={n?.reviews_activity?.new_review ?? true} onChange={(v) => setNotif('reviews_activity', 'new_review', v)} />
          <Row label="Leaderboard updates" value={n?.reviews_activity?.leaderboard ?? false} onChange={(v) => setNotif('reviews_activity', 'leaderboard', v)} />
          <Row label="Reels tagging" value={n?.reviews_activity?.reels ?? false} onChange={(v) => setNotif('reviews_activity', 'reels', v)} />
          <Row
            label="Quiet hours"
            sub={n?.quiet_hours ? `${n.quiet_hours.start} – ${n.quiet_hours.end}` : '22:00 – 07:00'}
            value={n?.quiet_hours?.enabled ?? false}
            onChange={(v) => setNotif('quiet_hours', 'enabled', v)}
            last
          />
        </Card>

        <SectionLabel>Privacy</SectionLabel>
        <Card>
          <Row label="Show phone to students" value={settings?.privacy?.show_phone ?? false} onChange={setPrivacy} last />
        </Card>

        <SectionLabel>Payout</SectionLabel>
        <Pressable onPress={() => router.push('/profile/edit' as never)}>
          <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: sansFor(600), fontSize: 14, color: theme.color.ink }}>Bank account</Text>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
                  Manage where your payouts land
                </Text>
              </View>
              <IconChevR size={18} color={theme.color.whisper} />
            </View>
          </View>
        </Pressable>

        <View style={{ marginTop: 8 }}>
          <Button
            variant="rose"
            block
            onPress={() =>
              Alert.alert('Log out', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: clear },
              ])
            }
          >
            Log out
          </Button>
        </View>

        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, textAlign: 'center', marginTop: 16 }}>
          Findemy Studio · v1.0
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
});
