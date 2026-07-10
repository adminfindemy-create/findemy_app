import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, sansFor, IconCheck } from '@findemy/ui';

export type SessionRosterRow = { user_id: string; name: string; checked_in: boolean; marked_at?: string };

// Format a marked_at timestamp to a short local time (e.g. "5:02 PM"); fall back to the raw
// string if it isn't a parseable date. Never invents a time when marked_at is absent.
function fmtTime(marked_at?: string): string | null {
  if (!marked_at) return null;
  const d = new Date(marked_at);
  if (isNaN(d.getTime())) return marked_at;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Prototype attendance/live roster: a card of rows, each with an In / Not-yet chip.
// `verb` = "Checked in" (in-studio QR) | "Joined" (online live room).
export function SessionRoster({
  rows,
  verb,
  variant = 'live',
}: {
  rows: SessionRosterRow[];
  verb: 'Checked in' | 'Joined';
  /** 'live' = an in-progress session (Not-yet). 'record' = a finished class (Present/Absent). */
  variant?: 'live' | 'record';
}) {
  const theme = useTheme();
  const record = variant === 'record';
  const present = rows.filter((r) => r.checked_in);
  const absent = rows.filter((r) => !r.checked_in);
  const absentText = record ? 'Absent' : verb === 'Joined' ? 'Not joined yet' : 'Not scanned yet';

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: theme.color.jadeSoft }]}>
          <Text style={[styles.badgeText, { color: theme.color.jade }]}>
            {record ? 'Present' : verb} {present.length}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: record ? theme.color.roseSoft : theme.color.paperWarm }]}>
          <Text style={[styles.badgeText, { color: record ? theme.color.rose : theme.color.inkSoft }]}>
            {record ? 'Absent' : 'Not yet'} {absent.length}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
        {rows.map((r, i) => {
          const time = fmtTime(r.marked_at);
          return (
            <View
              key={r.user_id || `${r.name}-${i}`}
              style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.color.hairline }]}
            >
              <View style={[styles.av, { backgroundColor: theme.color.persimmon }]}>
                <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 13, color: theme.color.ivory }}>
                  {r.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: sansFor(700), fontSize: 14, color: theme.color.ink }} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={{ fontFamily: sansFor(500), fontSize: 12, color: theme.color.mist, marginTop: 1 }}>
                  {r.checked_in ? `${record ? 'Present' : verb}${time ? ` · ${time}` : ''}` : absentText}
                </Text>
              </View>
              {r.checked_in ? (
                <View style={[styles.chk, { backgroundColor: theme.color.jadeSoft }]}>
                  <IconCheck size={13} color={theme.color.jade} />
                  <Text style={[styles.chkText, { color: theme.color.jade }]}>{record ? 'Present' : 'In'}</Text>
                </View>
              ) : (
                <View style={[styles.chk, { backgroundColor: record ? theme.color.roseSoft : theme.color.paperWarm }]}>
                  <Text style={[styles.chkText, { color: record ? theme.color.rose : theme.color.whisper }]}>
                    {record ? 'Absent' : '— Not yet'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontFamily: sansFor(700), fontSize: 11.5 },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  av: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  chk: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  chkText: { fontFamily: sansFor(700), fontSize: 11.5 },
});
