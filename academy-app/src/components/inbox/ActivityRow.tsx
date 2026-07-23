import type { ActivityItem } from '@findemy/types';
import { useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TONE_GLYPH: Record<ActivityItem['kind'], string> = {
  trial_done: '✓',
  review: '★',
  enrollment: '＋',
  workshop_reg: '◎',
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  const toneBg: Record<ActivityItem['icon_tone'], string> = {
    jade: theme.color.jadeSoft,
    marigold: theme.color.marigoldSoft,
    persimmon: theme.color.persimmonSoft,
    rose: theme.color.roseSoft,
  };
  const toneFg: Record<ActivityItem['icon_tone'], string> = {
    jade: theme.color.jade,
    marigold: '#8A5E1F',
    persimmon: theme.color.persimmonDeep,
    rose: theme.color.rose,
  };

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: theme.color.hairline, borderBottomWidth: isLast ? 0 : 1 },
      ]}
    >
      <View style={[styles.ic, { backgroundColor: toneBg[item.icon_tone] }]}>
        <Text style={{ fontSize: 14, color: toneFg[item.icon_tone], fontWeight: '700' }}>
          {TONE_GLYPH[item.kind]}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: theme.font.sans,
            fontSize: 13,
            color: theme.color.ink,
            lineHeight: 18,
          }}
        >
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: theme.font.sans,
              fontSize: 12,
              color: theme.color.mist,
              marginTop: 2,
            }}
          >
            {item.subtitle}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: theme.font.sans,
            fontSize: 11,
            color: theme.color.mist,
            marginTop: 3,
          }}
        >
          {timeAgo(item.at)}
        </Text>
      </View>
      {item.action ? (
        <Pressable onPress={() => router.push(item.action?.route as never)} hitSlop={8}>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 12,
              color: theme.color.persimmon,
              fontWeight: '600',
            }}
          >
            {item.action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  ic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
