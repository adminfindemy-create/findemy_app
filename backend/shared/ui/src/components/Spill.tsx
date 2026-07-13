import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Spill({
  state,
}: {
  state:
    | 'now'
    | 'upcoming'
    | 'done'
    | 'pending'
    | 'declined'
    | 'active'
    | 'trial'
    | 'inactive'
    | 'new'
    | 'confirmed'
    | 'completed'
    | 'attended'
    | 'cancelled'
    | 'booked'
    | 'rescheduled'
    | 'paid'
    | 'failed'
    | string;
}) {
  const theme = useTheme();
  const map: Record<string, { label: string; tone: string }> = {
    now: { label: 'Now', tone: theme.color.jade },
    upcoming: { label: 'Upcoming', tone: theme.color.marigold },
    done: { label: 'Done', tone: theme.color.mist },
    pending: { label: 'Pending', tone: theme.color.marigold },
    declined: { label: 'Declined', tone: theme.color.rose },
    active: { label: 'Active', tone: theme.color.jade },
    trial: { label: 'Trial', tone: theme.color.persimmon },
    inactive: { label: 'Inactive', tone: theme.color.mist },
    new: { label: 'New', tone: theme.color.persimmon },
    confirmed: { label: 'Confirmed', tone: theme.color.jade },
    completed: { label: 'Completed', tone: theme.color.ink },
    attended: { label: 'Attended', tone: theme.color.jade },
    cancelled: { label: 'Cancelled', tone: theme.color.mist },
    booked: { label: 'Booked', tone: theme.color.persimmon },
    rescheduled: { label: 'Rescheduled', tone: theme.color.marigold },
    paid: { label: 'Paid', tone: theme.color.jade },
    failed: { label: 'Failed', tone: theme.color.rose },
  };
  const matched = map[state] || { label: state, tone: theme.color.mist };

  return (
    <View style={[styles.spill, { backgroundColor: matched.tone + '20' }]}>
      <Text style={{ color: matched.tone, fontFamily: theme.font.sans, fontSize: 11, fontWeight: '600' }}>
        {matched.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
});
