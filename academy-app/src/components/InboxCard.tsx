import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useTheme, Avatar, Spill, IconButton, IconPhone, IconWa } from '@findemy/ui';
import type { TrialInboxItem } from '@findemy/types';
import { useRouter } from 'expo-router';

export function InboxCard({ item }: { item: TrialInboxItem }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/trial/${item.id}`)}
      style={[styles.card, { backgroundColor: theme.color.ivory }]}
    >
      <View style={styles.row}>
        <Avatar initial={item.student_name} tone="persimmon" size="md" />
        <View style={styles.info}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 15, fontWeight: '600', color: theme.color.ink }}>
            {item.student_name}
            {item.student_age ? ` · ${item.student_age}` : ''}
          </Text>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
            {item.batch_title}
          </Text>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
            {new Date(item.scheduled_at).toLocaleString()}
          </Text>
        </View>
        <Spill state={item.status} />
      </View>
      <View style={styles.actions}>
        <IconButton
          icon={<IconPhone size={18} color={theme.color.jade} />}
          accessibilityLabel={`Call ${item.student_name}`}
          onPress={() => item.student_phone && Linking.openURL(`tel:${item.student_phone}`)}
        />
        <IconButton
          icon={<IconWa size={18} color={theme.color.jade} />}
          accessibilityLabel={`Message ${item.student_name} on WhatsApp`}
          onPress={() =>
            item.student_phone &&
            Linking.openURL(`https://wa.me/${item.student_phone.replace(/\D/g, '')}`)
          }
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
});
