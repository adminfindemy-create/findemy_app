import { Text, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function StarRating({
  value,
  count,
}: {
  value: number;
  count?: number;
  editable?: boolean;
  onChange?: (v: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: theme.color.marigold, fontFamily: theme.font.sans, fontSize: 14 }}>
        {'★'.repeat(Math.round(value))}
        {'☆'.repeat(5 - Math.round(value))}
      </Text>
      {count !== undefined ? (
        <Text
          style={{
            color: theme.color.mist,
            fontFamily: theme.font.sans,
            fontSize: 12,
            marginLeft: 4,
          }}
        >
          ({count})
        </Text>
      ) : null}
    </View>
  );
}
