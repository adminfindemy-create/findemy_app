import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../ThemeProvider';

// M4.2: net-new date/time picker for scheduling a future 1:1 coaching session.
// Nothing in this package covers this today — the closest existing thing,
// enrollment/[id].tsx's PauseSheet preset pills, only picks a coarse duration
// bucket ("1 week" / "2 weeks"), not a calendar date + time-of-day, so it
// isn't reusable here. Deliberately dependency-free (no date-fns — this
// package has no date library dependency) and avoids `Intl` date formatting
// the same way enrollment/confirmation.tsx does, for Hermes locale gaps.
//
// Controlled like a normal form field: `value`/`onChange` carry the combined
// instant. Internally the date strip and time grid track which half of that
// instant has been picked so a partial selection (date but no time yet, or
// vice versa) can render before `onChange` fires with a complete Date.

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(minutesFromMidnight: number): string {
  const hour24 = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export type DateTimePickerProps = {
  /** Currently selected instant, or `null` if nothing's picked yet. */
  value: Date | null;
  onChange: (date: Date) => void;
  /** Earliest pickable instant. Defaults to `new Date()` (no scheduling into the past). */
  minDate?: Date;
  /** How many days ahead to show in the date strip. */
  daysAhead?: number;
  /** Interval between time slots, in minutes. */
  timeStepMin?: number;
  /** First time slot of the day, in minutes from midnight (default 7:00 AM). */
  dayStartMin?: number;
  /** Last time slot of the day, in minutes from midnight (default 9:00 PM). */
  dayEndMin?: number;
  style?: StyleProp<ViewStyle>;
};

export function DateTimePicker({
  value,
  onChange,
  minDate,
  daysAhead = 21,
  timeStepMin = 30,
  dayStartMin = 7 * 60,
  dayEndMin = 21 * 60,
  style,
}: DateTimePickerProps) {
  const theme = useTheme();
  // Computed once per mount (like TrialBookingSheet's `startOfToday()`) — this
  // is a scheduling floor, not a ticking clock, so it doesn't need to track
  // "now" on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const floor = useMemo(() => minDate ?? new Date(), []);
  const today = useMemo(() => startOfDay(floor), [floor]);

  const [pickedDate, setPickedDate] = useState<Date>(() => (value ? startOfDay(value) : today));
  const [pickedMinutes, setPickedMinutes] = useState<number | null>(() =>
    value ? value.getHours() * 60 + value.getMinutes() : null
  );

  // If the parent resets the field (e.g. clearing a form), drop the stale
  // in-progress time so the picker doesn't silently keep a value the parent
  // no longer holds.
  useEffect(() => {
    if (value == null) setPickedMinutes(null);
  }, [value]);

  const dateRange = useMemo(
    () => Array.from({ length: daysAhead }, (_, i) => addDays(today, i)),
    [today, daysAhead]
  );

  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let m = dayStartMin; m <= dayEndMin; m += timeStepMin) slots.push(m);
    return slots;
  }, [dayStartMin, dayEndMin, timeStepMin]);

  const isPickedToday = isSameDay(pickedDate, today);
  const floorMinutes = floor.getHours() * 60 + floor.getMinutes();

  const commit = (date: Date, minutesFromMidnight: number) => {
    const combined = new Date(date);
    combined.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
    onChange(combined);
  };

  const handlePickDate = (date: Date) => {
    setPickedDate(date);
    if (pickedMinutes == null) return;
    const stillValid = !isSameDay(date, today) || pickedMinutes > floorMinutes;
    if (stillValid) {
      commit(date, pickedMinutes);
    } else {
      // The previously-picked time-of-day has now fallen into the past
      // relative to the newly-picked (today's) date — clear it rather than
      // silently committing an invalid instant.
      setPickedMinutes(null);
    }
  };

  const handlePickTime = (minutesFromMidnight: number) => {
    setPickedMinutes(minutesFromMidnight);
    commit(pickedDate, minutesFromMidnight);
  };

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContent}
        style={styles.dateStrip}
      >
        {dateRange.map((date) => {
          const isSel = isSameDay(date, pickedDate);
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => handlePickDate(date)}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`}
              style={[
                styles.dateChip,
                {
                  backgroundColor: isSel ? theme.color.persimmon : theme.color.ivory,
                  borderColor: isSel ? theme.color.persimmon : theme.color.hairline,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: theme.font.sansBold,
                  fontSize: 9,
                  letterSpacing: 0.5,
                  color: isSel ? '#fff' : theme.color.mist,
                }}
              >
                {DAY_SHORT[date.getDay()].toUpperCase()}
              </Text>
              <Text
                style={{
                  fontFamily: theme.font.serif,
                  fontSize: 18,
                  color: isSel ? '#fff' : theme.color.ink,
                  marginTop: 2,
                }}
              >
                {date.getDate()}
              </Text>
              <Text
                style={{
                  fontFamily: theme.font.sansMedium,
                  fontSize: 9,
                  color: isSel ? 'rgba(255,255,255,0.85)' : theme.color.whisper,
                  marginTop: 1,
                }}
              >
                {MONTH_SHORT[date.getMonth()]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.timeGrid}>
        {timeSlots.map((minutesFromMidnight) => {
          const disabled = isPickedToday && minutesFromMidnight <= floorMinutes;
          const isSel = pickedMinutes === minutesFromMidnight;
          return (
            <Pressable
              key={minutesFromMidnight}
              disabled={disabled}
              onPress={() => handlePickTime(minutesFromMidnight)}
              accessibilityRole="button"
              accessibilityLabel={formatTime(minutesFromMidnight)}
              style={[
                styles.timeSlot,
                {
                  backgroundColor: isSel
                    ? theme.color.persimmon
                    : disabled
                      ? theme.color.paperWarm
                      : theme.color.ivory,
                  borderColor: isSel ? theme.color.persimmon : theme.color.hairline,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: theme.font.sansSemibold,
                  fontSize: 12.5,
                  color: isSel ? '#fff' : disabled ? theme.color.whisper : theme.color.ink,
                }}
              >
                {formatTime(minutesFromMidnight)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateStrip: { marginHorizontal: -2 },
  dateStripContent: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  dateChip: {
    width: 54,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  timeSlot: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
