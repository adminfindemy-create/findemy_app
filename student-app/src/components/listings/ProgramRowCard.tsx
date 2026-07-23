import type { Program } from '@/lib/programs';
import { IconChevR, useTheme } from '@findemy/ui';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  program: Program;
  onPress: () => void;
};

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

// Prototype `.row-card`: thumb + title + coach sub + "Trial · monthly" foot.
export function ProgramRowCard({ program, onPress }: Props) {
  const theme = useTheme();

  const trial = rupees(program.trial_fee_paise);
  const monthly =
    program.monthly_fee_paise_from > 0 ? ` · ${rupees(program.monthly_fee_paise_from)}/mo` : '';
  const isFull = program.total_seats_left <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
      ]}
    >
      <Image
        source={{ uri: program.image_url }}
        style={styles.thumb}
        contentFit="cover"
        transition={150}
      />

      <View style={styles.body}>
        <Text
          style={[styles.ttl, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}
          numberOfLines={1}
        >
          {program.title}
        </Text>
        <Text
          style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]}
          numberOfLines={1}
        >
          {program.coach_names.length ? program.coach_names.slice(0, 2).join(' · ') : program.level}
          {isFull ? '  ·  Full' : ''}
        </Text>
        <View style={styles.foot}>
          <Text
            style={[
              styles.footText,
              { fontFamily: theme.font.sansMedium, color: theme.color.mist },
            ]}
            numberOfLines={1}
          >
            Trial {trial}
            {monthly}
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
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 66, height: 66, borderRadius: 14 },
  body: { flex: 1, minWidth: 0 },
  ttl: { fontSize: 15, letterSpacing: -0.1, lineHeight: 17 },
  sub: { fontSize: 12, marginTop: 3 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  footText: { fontSize: 12, flex: 1 },
});
