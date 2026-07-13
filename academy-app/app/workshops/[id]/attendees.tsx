import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, sansFor, IconPhone, IconWa } from '@findemy/ui';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { useWorkshopRegistrations } from '@/hooks/useStudioQueries';
import { formatRupees } from '@/lib/format';

type Registrant = {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  registered_at: string;
  payment_status: string | null;
  amount_paise: number;
  user: { id: string; name: string; phone: string | null; age: number | null };
};

function StatusPill({ status }: { status: Registrant['status'] }) {
  const theme = useTheme();
  const map = {
    confirmed: { label: 'Confirmed', bg: theme.color.jadeSoft, fg: theme.color.jade },
    pending: { label: 'Pending', bg: theme.color.marigoldSoft, fg: theme.color.marigold },
    cancelled: { label: 'Cancelled', bg: theme.color.roseSoft, fg: theme.color.rose },
  } as const;
  const statusStyle = map[status] ?? map.pending;
  return (
    <View style={{ backgroundColor: statusStyle.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: sansFor(800), fontSize: 10, letterSpacing: 0.3, textTransform: 'uppercase', color: statusStyle.fg }}>{statusStyle.label}</Text>
    </View>
  );
}

function Row({ registrant }: { registrant: Registrant }) {
  const theme = useTheme();
  const phone = registrant.user.phone;

  const pay =
    registrant.amount_paise > 0
      ? registrant.payment_status === 'captured'
        ? `Paid ${formatRupees(registrant.amount_paise)}`
        : `Payment ${registrant.payment_status ?? 'pending'}`
      : 'Free';
  const date = new Date(registrant.registered_at);
  const dateLabel = isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const openWhatsApp = () => {
    if (!phone) return Alert.alert('No phone number', 'This attendee has no phone number on file.');
    const msg = encodeURIComponent(`Hi ${registrant.user.name}, this is about your workshop booking.`);
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`);
  };
  const call = () => {
    if (!phone) return Alert.alert('No phone number', 'This attendee has no phone number on file.');
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.row, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
      <View style={[styles.avatar, { backgroundColor: theme.color.persimmon }]}>
        <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 15, color: theme.color.ivory }}>
          {registrant.user.name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }} numberOfLines={1}>
            {registrant.user.name}
          </Text>
          <StatusPill status={registrant.status} />
        </View>
        <Text style={{ fontFamily: sansFor(600), fontSize: 12, color: theme.color.mist, marginTop: 2 }} numberOfLines={1}>
          {[pay, dateLabel].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {phone ? (
        <>
          <Pressable onPress={call} style={[styles.act, { backgroundColor: theme.color.paperWarm }]} hitSlop={6}>
            <IconPhone size={16} color={theme.color.ink} />
          </Pressable>
          <Pressable onPress={openWhatsApp} style={[styles.act, { backgroundColor: '#25D366' }]} hitSlop={6}>
            <IconWa size={16} color="#fff" />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export default function WorkshopAttendeesScreen() {
  const theme = useTheme();
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { data, isLoading, isError, refetch } = useWorkshopRegistrations(id);

  const title = data?.workshop?.title ? `Booked · ${data.workshop.title}` : 'Booked';
  const rows = (data?.registrations ?? []) as Registrant[];

  return (
    <Screen header={<ScreenHeader title={title} showBack />} bottomTab={null} scroll={false}>
      {isError ? (
        <View style={{ padding: 24 }}>
          <ErrorState message="Couldn't load bookings." onRetry={refetch} />
        </View>
      ) : (
        <FlatList
          data={isLoading ? [] : rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Row registrant={item} />}
          contentContainerStyle={{ paddingVertical: 14, paddingBottom: 40 }}
          ListHeaderComponent={
            data?.workshop && rows.length > 0 ? (
              <Text style={{ fontFamily: sansFor(700), fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: theme.color.whisper, marginBottom: 10 }}>
                {rows.length} {rows.length === 1 ? 'person' : 'people'} · {data.workshop.registered_count} of {data.workshop.capacity} seats
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, textAlign: 'center', marginTop: 40 }}>
              {isLoading ? 'Loading…' : 'No bookings yet.'}
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
