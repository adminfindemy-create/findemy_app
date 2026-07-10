import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useTheme, sansFor, BlockPrintCover,
  IconEdit, IconStar, IconSparkle, IconUsers, IconCal, IconSliders, IconShield, IconPhone, IconHelp, IconMail, IconChevR,
} from '@findemy/ui';
import { useAuth } from '@/stores/auth';
import { useStudioDashboard, useStudioReviewsSummary, useStudioPrograms } from '@/hooks/useStudioQueries';
import { useStudioAcademy } from '@/hooks/useStudioAcademy';
import { SafeAreaView } from 'react-native-safe-area-context';

function fmtAmount(paise?: number): string {
  if (!paise) return '₹0';
  const amount = Math.round(paise / 100);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function PRow({
  icon, label, value, onPress, tone = 'default', last,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  tone?: 'default' | 'rose';
  last?: boolean;
}) {
  const theme = useTheme();
  const color = tone === 'rose' ? theme.color.rose : theme.color.ink;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.prow,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.color.hairline },
        pressed && { backgroundColor: theme.color.paperWarm },
      ]}
    >
      <View style={styles.prowIcon}>{icon}</View>
      <Text style={{ flex: 1, fontFamily: sansFor(600), fontSize: 14.5, color }}>{label}</Text>
      {value ? (
        <Text style={{ fontFamily: sansFor(600), fontSize: 13, color: theme.color.mist, marginRight: 6 }}>{value}</Text>
      ) : null}
      <IconChevR size={18} color={theme.color.whisper} />
    </Pressable>
  );
}

export default function StudioScreen() {
  const theme = useTheme();
  const router = useRouter();
  const account = useAuth((s) => s.account);
  const academy = useAuth((s) => s.academy);
  const clear = useAuth((s) => s.clear);
  const { data } = useStudioDashboard();
  const dashboard = data as Record<string, any> | undefined;
  const { data: academyData } = useStudioAcademy();
  const aca = (academyData as any)?.academy as Record<string, any> | undefined;
  const { data: reviewsSummary } = useStudioReviewsSummary();
  const { data: programsData } = useStudioPrograms();

  const name = aca?.name ?? academy?.name ?? 'My Academy';
  const cover = aca?.images?.[0] as string | undefined;
  const category = (aca?.category ?? academy?.category ?? 'music') as 'music' | 'dance' | 'arts' | 'yoga';
  const verified = aca?.verified ?? false;
  const rating = aca?.rating != null ? Number(aca.rating) : 0;
  const ratingCount = aca?.rating_count ?? reviewsSummary?.count ?? 0;
  const address = aca?.address ?? '';

  const metaLine = [
    rating > 0 ? `★ ${rating.toFixed(1)}` : null,
    rating > 0 && ratingCount ? `${ratingCount} reviews` : null,
    address || null,
  ].filter(Boolean).join(' · ') || (account?.ownerName ?? 'Your academy');

  const studentsCount = dashboard?.students_count ?? 0;
  const programsCount = programsData?.items?.length ?? 0;
  const monthEarnings = fmtAmount(dashboard?.earnings_summary?.this_month_paise);

  const onLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: clear },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.head}>
          <Text style={{ fontFamily: sansFor(700), fontSize: 11, letterSpacing: 1.8, color: theme.color.persimmon }}>
            YOUR ACADEMY
          </Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, color: theme.color.ink, marginTop: 4 }}>
            Studio
          </Text>
        </View>

        {/* Cover-banner card */}
        <View style={[styles.coverCard, { borderColor: theme.color.hairline }, theme.shadow.sm]}>
          <View style={styles.coverImgWrap}>
            {cover ? (
              <Image source={{ uri: cover }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
            ) : (
              <BlockPrintCover category={category} variant={2} height={104} hideLetter style={StyleSheet.absoluteFill as any} />
            )}
            <View style={styles.coverScrim} />
          </View>
          <View style={styles.coverBody}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: theme.font.serif, fontSize: 23, lineHeight: 26, color: theme.color.ink }} numberOfLines={1}>
                {name}
              </Text>
              <Text style={{ fontFamily: sansFor(600), fontSize: 12.5, color: theme.color.mist, marginTop: 4 }} numberOfLines={1}>
                {metaLine}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={() => router.push('/profile/edit' as any)}>
              <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: theme.color.persimmon }}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* 3-up quick stats */}
        <View style={styles.pstats}>
          {[
            { v: String(studentsCount), t: 'Students', to: '/(tabs)/students' },
            { v: String(programsCount), t: 'Programs', to: '/programs' },
            { v: monthEarnings, t: 'Earned', to: '/earnings' },
          ].map((s) => (
            <Pressable
              key={s.t}
              onPress={() => router.push(s.to as never)}
              accessibilityRole="button"
              accessibilityLabel={s.t}
              style={[styles.pstat, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}
            >
              <Text style={{ fontFamily: theme.font.serif, fontSize: 22, lineHeight: 24, color: theme.color.ink }}>{s.v}</Text>
              <Text style={{ fontFamily: sansFor(700), fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', color: theme.color.whisper, marginTop: 5 }}>
                {s.t}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Manage */}
        <Text style={[styles.psec, { color: theme.color.whisper }]}>MANAGE</Text>
        <View style={[styles.pmenu, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
          <PRow icon={<IconEdit size={20} color={theme.color.persimmon} />} label="Academy profile" onPress={() => router.push('/profile/edit' as any)} />
          <PRow icon={<Text style={{ fontFamily: theme.font.serif, fontSize: 18, color: theme.color.persimmon }}>₹</Text>} label="Earnings & payouts" value={monthEarnings} onPress={() => router.push('/earnings')} />
          <PRow icon={<IconStar size={20} color={theme.color.persimmon} />} label="Reviews" value={rating > 0 ? `★ ${rating.toFixed(1)}` : undefined} onPress={() => router.push('/reviews')} />
          <PRow icon={<IconSparkle size={20} color={theme.color.persimmon} />} label="Workshops" onPress={() => router.push('/workshops')} />
          <PRow icon={<IconUsers size={20} color={theme.color.persimmon} />} label="Coaches" onPress={() => router.push('/coaches')} />
          <PRow icon={<IconCal size={20} color={theme.color.persimmon} />} label="Programs" value={programsCount ? String(programsCount) : undefined} onPress={() => router.push('/programs' as any)} last />
        </View>

        {/* Account */}
        <Text style={[styles.psec, { color: theme.color.whisper }]}>ACCOUNT</Text>
        <View style={[styles.pmenu, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }, theme.shadow.sm]}>
          <PRow icon={<IconSliders size={20} color={theme.color.persimmon} />} label="Notifications & settings" onPress={() => router.push('/settings')} />
          <PRow
            icon={<IconShield size={20} color={theme.color.persimmon} />}
            label="Verification / KYC"
            value={verified ? 'Verified' : 'Pending'}
            onPress={() => Alert.alert('Verification', verified ? 'Your academy is verified.' : 'Complete KYC to get verified and build student trust.')}
          />
          <PRow icon={<IconPhone size={20} color={theme.color.persimmon} />} label="Phone" value={account?.phone ?? '—'} onPress={() => {}} />
          <PRow icon={<IconHelp size={20} color={theme.color.persimmon} />} label="Help & FAQ" onPress={() => Linking.openURL('https://findemy.app/help').catch(() => {})} />
          <PRow icon={<IconMail size={20} color={theme.color.persimmon} />} label="Contact support" onPress={() => Linking.openURL('https://wa.me/919999999999').catch(() => {})} last />
        </View>

        <View style={{ paddingHorizontal: 22, marginTop: 20 }}>
          <Pressable
            onPress={onLogout}
            style={{ paddingVertical: 14, borderRadius: 999, borderWidth: 1.5, borderColor: theme.color.hairline, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.rose }}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, textAlign: 'center', marginTop: 16 }}>
          Findemy Studio · v1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  coverCard: {
    marginHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 13,
  },
  coverImgWrap: {
    height: 104,
    position: 'relative',
  },
  coverScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    backgroundColor: 'rgba(20,17,15,0.22)',
  },
  coverBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 15,
  },
  pstats: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 22,
    marginBottom: 6,
  },
  pstat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
  psec: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 22,
    marginTop: 18,
    marginBottom: 8,
  },
  pmenu: {
    marginHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  prowIcon: {
    width: 22,
    alignItems: 'center',
  },
});
