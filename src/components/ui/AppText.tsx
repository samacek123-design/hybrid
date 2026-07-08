import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { fonts } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

type Variant =
  | 'hero' // oversized condensed display
  | 'display' // section display
  | 'title' // card titles
  | 'label' // uppercase mono microcopy
  | 'mono' // numbers / data
  | 'monoBig' // big stat numerals
  | 'body' // condensed regular reading text
  | 'serif'; // editorial italic voice — the "coach"

const styles: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 64, lineHeight: 62, textTransform: 'uppercase', letterSpacing: -0.5 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 36, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, textTransform: 'uppercase', letterSpacing: 0.3 },
  label: { fontFamily: fonts.monoMedium, fontSize: 11, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 1.2 },
  mono: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 20 },
  monoBig: { fontFamily: fonts.monoBold, fontSize: 28, lineHeight: 32 },
  body: { fontFamily: fonts.displayRegular, fontSize: 17, lineHeight: 24 },
  serif: { fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 23 },
};

export interface AppTextProps extends TextProps {
  v?: Variant;
  color?: string;
  center?: boolean;
}

export function AppText({ v = 'body', color, center, style, ...rest }: AppTextProps) {
  const { c } = usePalette();
  return (
    <Text
      {...rest}
      style={[styles[v], { color: color ?? c.ink }, center && { textAlign: 'center' }, style]}
    />
  );
}
