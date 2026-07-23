import { getEventImage } from '@/lib/eventImages';
import { IconChevR, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Prototype badges by event type: b-comp / b-event / b-jade.
function badgeFor(type: string, theme: any): { label: string; bg: string; fg: string } {
  switch (type) {
    case 'competition':
      return { label: 'Competition', bg: theme.color.persimmon, fg: '#fff' };
    case 'talent_hunt':
      return { label: 'Talent Hunt', bg: theme.color.persimmonSoft, fg: theme.color.persimmonDeep };
    case 'meetup':
      return { label: 'Meetup', bg: theme.color.jadeSoft, fg: theme.color.jade };
    default:
      return {
        label: (type ?? 'Event').replace(/_/g, ' '),
        bg: theme.color.persimmonSoft,
        fg: theme.color.persimmonDeep,
      };
  }
}

// Prototype `.row-card`: thumb + title + "badge · date" sub + "location · price" foot.
export function EventRowCard({
  event,
  onPress,
}: {
  event: {
    id: string;
    title: string;
    type: string;
    start_at?: string;
    startAt?: string;
    location?: string;
    price_paise?: number;
    spots_left?: number;
  };
  onPress?: () => void;
}) {
  const theme = useTheme();
  const badge = badgeFor(event.type, theme);

  const rawStart = event.start_at ?? event.startAt;
  const date = rawStart ? new Date(rawStart) : null;
  const dateValid = date && !Number.isNaN(date.getTime());

  const pricePaise = event.price_paise ?? 0;
  const isFree = pricePaise === 0;
  const price = isFree ? 'Free' : `₹${Math.round(pricePaise / 100).toLocaleString('en-IN')}`;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
      ]}
    >
      <Image
        source={{ uri: getEventImage(event.type) }}
        style={styles.thumb}
        contentFit="cover"
        transition={150}
      />

      <View style={styles.body}>
        <Text
          style={[styles.ttl, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}
          numberOfLines={1}
        >
          {event.title}
        </Text>

        <View style={styles.subRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
          {dateValid ? (
            <Text
              style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]}
              numberOfLines={1}
            >
              {format(date!, 'd MMM')}
            </Text>
          ) : null}
        </View>

        <View style={styles.foot}>
          <Text
            style={[
              styles.footText,
              { fontFamily: theme.font.sansMedium, color: theme.color.mist },
            ]}
            numberOfLines={1}
          >
            {event.location ?? ''}
          </Text>
          <Text
            style={{
              fontFamily: theme.font.sansBold,
              fontSize: 14,
              color: isFree ? theme.color.jade : theme.color.ink,
            }}
          >
            {price}
          </Text>
          <IconChevR size={18} color={theme.color.whisper} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  thumb: { width: 74, height: 74, borderRadius: 15 },
  body: { flex: 1, minWidth: 0 },
  ttl: { fontSize: 16, letterSpacing: -0.1, lineHeight: 18 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  sub: { fontSize: 12.5, flexShrink: 1 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  footText: { fontSize: 12.5, flex: 1 },
});
