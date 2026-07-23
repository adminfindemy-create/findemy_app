import type { ScheduleItem } from '@findemy/types';
import { Spill, useTheme } from '@findemy/ui';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ScheduleDay({
  date,
  items,
}: {
  date: string;
  items: ScheduleItem[];
}) {
  const theme = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const label = format(new Date(`${date}T12:00:00`), 'EEE d');

  return (
    <View style={[styles.day, { borderBottomColor: theme.color.hairline }]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text
          style={{
            fontFamily: theme.font.sans,
            fontSize: 15,
            fontWeight: '600',
            color: theme.color.ink,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
          {items.length} batch{items.length !== 1 ? 'es' : ''}
        </Text>
      </Pressable>
      {expanded && (
        <View style={styles.items}>
          {items.map((item) => (
            <Pressable
              key={`${item.batch_id}-${item.start_time}-${item.end_time}`}
              onPress={() => router.push(`/batches/${item.batch_id}`)}
              style={[styles.item, { backgroundColor: theme.color.paper }]}
            >
              <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.ink }}>
                {item.batch_title}
              </Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
                {format(new Date(item.start_time), 'h:mm a')} –{' '}
                {format(new Date(item.end_time), 'h:mm a')}
              </Text>
              <Spill state={item.status} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  items: {
    marginTop: 8,
    gap: 8,
  },
  item: {
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
