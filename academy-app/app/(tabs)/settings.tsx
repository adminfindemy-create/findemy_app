import React from 'react';
import { View, Text, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { useTheme, sansFor, Button, IconChevR } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { useStudioSettings, useUpdateStudioSettings } from '@/hooks/useStudioQueries';
import { Screen, ScreenHeader } from '@/components/common/Screen';
import type { Settings } from '@findemy/types';
import { useToast } from '@/components/common/Toast';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { clear } = useAuth();
  const { data } = useStudioSettings();
  const update = useUpdateStudioSettings();
  const { show: showToast } = useToast();
  const settings = data?.settings as Settings | undefined;
  const notifications = settings?.notifications;

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
    onChange: (enabled: boolean) => void;
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
          <Row label="Push" value={notifications?.new_trial?.push ?? true} onChange={(enabled) => setNotif('new_trial', 'push', enabled)} />
          <Row label="WhatsApp" sub={settings?.contact?.whatsapp} value={notifications?.new_trial?.whatsapp ?? false} onChange={(enabled) => setNotif('new_trial', 'whatsapp', enabled)} />
          <Row label="Email" sub={settings?.contact?.email} value={notifications?.new_trial?.email ?? false} onChange={(enabled) => setNotif('new_trial', 'email', enabled)} last />
        </Card>

        <SectionLabel>Classes</SectionLabel>
        <Card>
          <Row label="Reminder 30 min before" value={notifications?.classes?.reminder_30min ?? true} onChange={(enabled) => setNotif('classes', 'reminder_30min', enabled)} />
          <Row label="Attendance reminder" value={notifications?.classes?.attendance_reminder ?? true} onChange={(enabled) => setNotif('classes', 'attendance_reminder', enabled)} last />
        </Card>

        <SectionLabel>Reviews & activity</SectionLabel>
        <Card>
          <Row label="New review" value={notifications?.reviews_activity?.new_review ?? true} onChange={(enabled) => setNotif('reviews_activity', 'new_review', enabled)} />
          <Row label="Leaderboard updates" value={notifications?.reviews_activity?.leaderboard ?? false} onChange={(enabled) => setNotif('reviews_activity', 'leaderboard', enabled)} />
          <Row label="Reels tagging" value={notifications?.reviews_activity?.reels ?? false} onChange={(enabled) => setNotif('reviews_activity', 'reels', enabled)} />
          <Row
            label="Quiet hours"
            sub={notifications?.quiet_hours ? `${notifications.quiet_hours.start} – ${notifications.quiet_hours.end}` : '22:00 – 07:00'}
            value={notifications?.quiet_hours?.enabled ?? false}
            onChange={(enabled) => setNotif('quiet_hours', 'enabled', enabled)}
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
