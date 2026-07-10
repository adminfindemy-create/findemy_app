import type { ViewStyle } from 'react-native';
import { BlockPrintCover } from './BlockPrintCover';

export type CategorySlot =
  | 'music'
  | 'dance'
  | 'arts'
  | 'yoga'
  | 'art-1'
  | 'art-2'
  | 'art-3'
  | 'art-4';

const SLOT_TO_CATEGORY: Record<CategorySlot, 'music' | 'dance' | 'arts' | 'yoga'> = {
  music: 'music',
  dance: 'dance',
  arts: 'arts',
  yoga: 'yoga',
  'art-1': 'music',
  'art-2': 'dance',
  'art-3': 'arts',
  'art-4': 'yoga',
};

const SLOT_TO_VARIANT: Record<CategorySlot, 1 | 2 | 3 | 4> = {
  music: 1,
  dance: 2,
  arts: 3,
  yoga: 4,
  'art-1': 1,
  'art-2': 2,
  'art-3': 3,
  'art-4': 4,
};

const SLOT_TO_LABEL: Record<CategorySlot, string> = {
  music: 'Music',
  dance: 'Dance',
  arts: 'Arts',
  yoga: 'Yoga',
  'art-1': 'Music',
  'art-2': 'Dance',
  'art-3': 'Arts',
  'art-4': 'Yoga',
};

/**
 * Thin wrapper around BlockPrintCover, preserved for backwards compatibility
 * with screens that pass a `slot` prop. New code should call BlockPrintCover
 * directly with `category` + `variant`.
 */
export function CategoryArt({
  slot,
  height = 160,
  style,
  hideLetter,
}: {
  slot: CategorySlot;
  height?: number;
  style?: ViewStyle;
  hideLetter?: boolean;
}) {
  return (
    <BlockPrintCover
      category={SLOT_TO_CATEGORY[slot]}
      variant={SLOT_TO_VARIANT[slot]}
      letter={SLOT_TO_LABEL[slot][0]}
      height={height}
      style={style}
      hideLetter={hideLetter}
    />
  );
}
