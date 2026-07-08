/**
 * The reward moment — flagship animation of the app.
 *
 * Choreography (one rhythm, spring-based, ~1.4s total, all interruptible):
 *   1. color flash (haptic-equivalent)            0–120ms
 *   2. radial burst rays scale + fade             80–500ms
 *   3. verdict stamp slams in (2.4× → 1, spring)  180ms→
 *   4. ink specks pop around the stamp            on stamp land
 *   5. delta rows stagger up                      500ms→, 60ms apart
 *   6. coach line + continue                      800ms→
 * Respects prefers-reduced-motion: everything lands instantly.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { BlockButton } from '@/components/ui/Bits';
import { fonts, layout, motion, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

export interface RewardLine {
  label: string;
  detail: string;
  good: boolean;
}

export interface RewardSummary {
  verdict: 'PR' | 'BEAT' | 'HIT' | 'HELD' | 'LOGGED';
  color: string;
  lines: RewardLine[];
  coach: string;
}

function BurstRays({ color, size }: { color: string; size: number }) {
  const rays = 16;
  const cx = size / 2;
  const inner = size * 0.26;
  const outer = size * 0.48;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: rays }, (_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const long = i % 2 === 0;
        const r1 = inner + (long ? 0 : size * 0.05);
        const r2 = outer - (long ? 0 : size * 0.06);
        return (
          <Line
            key={i}
            x1={cx + Math.cos(a) * r1}
            y1={cx + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2}
            y2={cx + Math.sin(a) * r2}
            stroke={color}
            strokeWidth={long ? 3 : 2}
          />
        );
      })}
    </Svg>
  );
}

function Speck({ x, y, r, color, delay, reduced }: { x: number; y: number; r: number; color: string; delay: number; reduced: boolean }) {
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) v.value = withDelay(delay, withSpring(1, motion.spring));
  }, [v, delay, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: v.value }, { rotate: `${r}deg` }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, top: y, width: 8, height: 8, backgroundColor: color }, st]}
    />
  );
}

export function RewardOverlay({ summary, onDone }: { summary: RewardSummary; onDone: () => void }) {
  const { c } = usePalette();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const flash = useSharedValue(0);
  const burst = useSharedValue(reduced ? 1 : 0);
  const stamp = useSharedValue(reduced ? 1 : 0);
  const rows = useSharedValue(reduced ? 1 : 0);
  const tail = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    flash.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
    );
    burst.value = withDelay(80, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    stamp.value = withDelay(180, withSpring(1, motion.spring));
    rows.value = withDelay(500, withTiming(1, { duration: motion.base }));
    tail.value = withDelay(820, withTiming(1, { duration: motion.base }));
  }, [reduced, flash, burst, stamp, rows, tail]);

  const flashSt = useAnimatedStyle(() => ({ opacity: flash.value * 0.28 }));
  const burstSt = useAnimatedStyle(() => ({
    opacity: burst.value * (1 - burst.value * 0.55),
    transform: [{ scale: 0.55 + burst.value * 0.55 }],
  }));
  const stampSt = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.value * 1.6),
    transform: [{ scale: 2.4 - stamp.value * 1.4 }, { rotate: `${-14 + stamp.value * 8}deg` }],
  }));
  const rowsSt = useAnimatedStyle(() => ({
    opacity: rows.value,
    transform: [{ translateY: (1 - rows.value) * 16 }],
  }));
  const tailSt = useAnimatedStyle(() => ({
    opacity: tail.value,
    transform: [{ translateY: (1 - tail.value) * 10 }],
  }));

  const burstSize = 260;
  const isPr = summary.verdict === 'PR';
  const stampColor = isPr ? c.gold : summary.color;

  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.paper }]} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: stampColor }, flashSt]}
      />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: layout.gutter,
          paddingVertical: Math.max(space.xl, height * 0.06),
        }}
      >
        <View style={{ width: '100%', maxWidth: layout.maxWidth - 40, alignItems: 'center', gap: space.lg }}>
          <View style={{ width: burstSize, height: burstSize, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, burstSt]}>
              <BurstRays color={stampColor} size={burstSize} />
            </Animated.View>
            <Animated.View style={stampSt}>
              <View
                style={{
                  borderWidth: 5,
                  borderColor: stampColor,
                  paddingHorizontal: 26,
                  paddingVertical: 10,
                  transform: [{ rotate: '-6deg' }],
                  backgroundColor: c.paper,
                }}
              >
                <AppText v="hero" color={stampColor} style={{ fontSize: isPr ? 84 : 64, lineHeight: isPr ? 84 : 66, letterSpacing: 3 }}>
                  {summary.verdict}
                </AppText>
              </View>
              <Speck x={-16} y={-10} r={20} color={stampColor} delay={420} reduced={reduced} />
              <Speck x={-6} y={40} r={-15} color={stampColor} delay={470} reduced={reduced} />
              <Speck x={200} y={-14} r={45} color={stampColor} delay={440} reduced={reduced} />
              <Speck x={215} y={55} r={-30} color={stampColor} delay={500} reduced={reduced} />
            </Animated.View>
          </View>

          <Animated.View style={[{ width: '100%', gap: 2 }, rowsSt]}>
            {summary.lines.map((l, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 9,
                  borderBottomWidth: 1,
                  borderBottomColor: c.lineFaint,
                }}
              >
                <AppText v="label" color={c.inkSoft} numberOfLines={1} style={{ flex: 1, marginRight: 12 }}>
                  {l.label}
                </AppText>
                <AppText
                  v="mono"
                  numberOfLines={1}
                  color={l.good ? summary.color : c.inkSoft}
                  style={{ fontFamily: l.good ? fonts.monoBold : fonts.mono, fontSize: 13 }}
                >
                  {l.detail}
                </AppText>
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[{ width: '100%', gap: space.lg, alignItems: 'center' }, tailSt]}>
            <AppText v="serif" center color={c.inkSoft} style={{ maxWidth: 380 }}>
              {summary.coach}
            </AppText>
            <View style={{ width: '100%' }}>
              <BlockButton label="Continue" onPress={onDone} />
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
