/**
 * Small shared bits: rules, stamps, buttons, steppers, tally marks.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconMinus, IconPlus } from '@/components/ui/Icons';
import { PressableScale } from '@/components/ui/Pressable';
import { fonts, layout, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

/** hard editorial rule */
export function Rule({ faint, style }: { faint?: boolean; style?: ViewStyle }) {
  const { c } = usePalette();
  return (
    <View
      style={[{ height: faint ? layout.hairline : layout.rule, backgroundColor: faint ? c.lineFaint : c.line }, style]}
    />
  );
}

/** rotated rubber-stamp badge */
export function Stamp({
  text,
  color,
  size = 'md',
  rotate = -6,
  style,
}: {
  text: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  rotate?: number;
  style?: ViewStyle;
}) {
  const fontSize = size === 'lg' ? 44 : size === 'md' ? 18 : 12;
  const pad = size === 'lg' ? 14 : size === 'md' ? 6 : 3;
  return (
    <View
      style={[
        {
          borderWidth: size === 'lg' ? 4 : 2,
          borderColor: color,
          paddingHorizontal: pad * 2,
          paddingVertical: pad,
          transform: [{ rotate: `${rotate}deg` }],
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText v="display" color={color} style={{ fontSize, lineHeight: fontSize * 1.05, letterSpacing: 2 }}>
        {text}
      </AppText>
    </View>
  );
}

/** primary block button — ink slab, paper text */
export function BlockButton({
  label,
  onPress,
  color,
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  const { c } = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? c.inkFaint : (color ?? c.ink),
        paddingVertical: small ? 10 : 16,
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
      }}
    >
      <AppText v={small ? 'title' : 'display'} color={c.paper} style={small ? { fontSize: 16 } : { fontSize: 24 }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** ghost button — 2px outline */
export function GhostButton({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const { c } = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={{
        borderWidth: layout.rule,
        borderColor: color ?? c.line,
        paddingVertical: 10,
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
      }}
    >
      <AppText v="title" color={color ?? c.ink} style={{ fontSize: 16 }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** numeric stepper — the app's core input (no keyboards in the loop) */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format,
  label,
  width = 96,
  buttonWidth = 40,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  label?: string;
  width?: number;
  buttonWidth?: number;
}) {
  const { c } = usePalette();
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {label ? (
        <AppText v="label" color={c.inkSoft}>
          {label}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', borderWidth: layout.rule, borderColor: c.line }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`decrease ${label ?? ''}`}
          onPress={() => onChange(round(Math.max(min, value - step)))}
          style={{ width: buttonWidth, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paperSunken, minHeight: 44 }}
        >
          <IconMinus size={16} color={c.ink} />
        </PressableScale>
        <View style={{ width, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paperRaised }}>
          <AppText v="mono" style={{ fontFamily: fonts.monoBold, fontSize: 16 }}>
            {format ? format(value) : String(value)}
          </AppText>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`increase ${label ?? ''}`}
          onPress={() => onChange(round(Math.min(max, value + step)))}
          style={{ width: buttonWidth, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paperSunken, minHeight: 44 }}
        >
          <IconPlus size={16} color={c.ink} />
        </PressableScale>
      </View>
    </View>
  );
}

/** tally marks — four strokes and a diagonal fifth, for the weekly card */
export function Tally({ count, total, color }: { count: number; total: number; color: string }) {
  const { c } = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: 7,
            height: 30,
            backgroundColor: i < count ? color : 'transparent',
            borderWidth: i < count ? 0 : 1.5,
            borderColor: c.lineFaint,
            transform: [{ rotate: i < count ? '-8deg' : '0deg' }],
          }}
        />
      ))}
    </View>
  );
}
