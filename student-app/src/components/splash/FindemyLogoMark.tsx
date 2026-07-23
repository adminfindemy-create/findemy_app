import { useTheme } from '@findemy/ui';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

type Props = {
  size?: number;
};

/**
 * Findemy 5-petal mark.
 *
 * PLACEHOLDER GEOMETRY — trace the real petals + discipline glyphs from
 * ai-usage/splash_screen.jpeg and replace the `d` strings below. Fills already
 * map to real theme tokens, so only the path data changes. viewBox is a
 * 120x150 portrait box (teardrop / map-pin proportions).
 */
export function FindemyLogoMark({ size = 132 }: Props) {
  const theme = useTheme();
  const width = size;
  const height = (size * 150) / 120;

  // Geometric fallback: a pin/teardrop split into 5 wedges around center
  // (60,66) flaring up-and-out, converging to the point at (60,142).
  const PETALS: { d: string; fill: string }[] = [
    // top-left — dance (persimmon)
    { d: 'M60 66 L60 12 C40 14 26 30 26 52 C26 60 30 66 38 70 Z', fill: theme.color.persimmon },
    // mid-left — paint (jade)
    { d: 'M60 66 L38 70 C22 76 16 92 22 106 C28 100 44 90 60 82 Z', fill: theme.color.jade },
    // top-right — music (plum)
    { d: 'M60 66 L60 12 C80 14 94 30 94 52 C94 60 90 66 82 70 Z', fill: theme.color.plum },
    // mid-right — yoga (bone / sand)
    { d: 'M60 66 L82 70 C98 76 104 92 98 106 C92 100 76 90 60 82 Z', fill: theme.color.bone },
    // center point — figure (ivory)
    { d: 'M60 82 L22 106 C34 126 60 142 60 142 C60 142 86 126 98 106 Z', fill: theme.color.ivory },
  ];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 120 150">
        {PETALS.map((petal, index) => (
          <Path key={index} d={petal.d} fill={petal.fill} />
        ))}
        {/* small focal dot at the mark's heart (stands in for a glyph) */}
        <Circle cx={60} cy={66} r={6} fill={theme.color.navy} />
      </Svg>
    </View>
  );
}
