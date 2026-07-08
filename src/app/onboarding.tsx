/**
 * Onboarding — the cinematic surface. Establishes the brand (rotating
 * track-rings, oversized type, marquee) while capturing goal, frequency
 * and baselines, then "prints" the program.
 */
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { BlockButton, Rule, Stepper } from '@/components/ui/Bits';
import { IconArrowLeft, IconBarbell, IconTrack } from '@/components/ui/Icons';
import { PressableScale } from '@/components/ui/Pressable';
import { GOAL_PARAMS, generateProgram, fmtPace, type Baseline } from '@/lib/engine';
import { useStore } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { fonts, layout, motion, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

// --- brand art: slowly rotating track rings ---------------------------------
function TrackRings({ size, color, faint }: { size: number; color: string; faint: string }) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  React.useEffect(() => {
    if (!reduced) turn.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1);
  }, [turn, reduced]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, st]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Ellipse cx="100" cy="100" rx="96" ry="60" stroke={faint} strokeWidth="1.5" fill="none" />
        <Ellipse cx="100" cy="100" rx="78" ry="48" stroke={faint} strokeWidth="1" fill="none" />
        <Ellipse cx="100" cy="100" rx="60" ry="36" stroke={color} strokeWidth="2" fill="none" strokeDasharray="6 10" />
        <Circle cx="100" cy="40" r="4" fill={color} />
      </Svg>
    </Animated.View>
  );
}

// --- marquee strip -----------------------------------------------------------
function Marquee({ text, color }: { text: string; color: string }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const [w, setW] = useState(0);
  React.useEffect(() => {
    if (w > 0 && !reduced) {
      x.value = 0;
      x.value = withRepeat(withTiming(-w, { duration: w * 28, easing: Easing.linear }), -1);
    }
  }, [w, x, reduced]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const chunk = `${text} · `.repeat(6);
  return (
    <View style={{ overflow: 'hidden', width: '100%' }}>
      <Animated.View style={[{ flexDirection: 'row' }, st]}>
        <AppText
          v="title"
          color={color}
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
          style={{ fontSize: 15, letterSpacing: 3, flexShrink: 0 }}
        >
          {chunk}
        </AppText>
        <AppText v="title" color={color} style={{ fontSize: 15, letterSpacing: 3, flexShrink: 0 }}>
          {chunk}
        </AppText>
      </Animated.View>
    </View>
  );
}

// --- steps -------------------------------------------------------------------
type Step = 'intro' | 'goal' | 'frequency' | 'strength' | 'cardio' | 'printing';
const ORDER: Step[] = ['intro', 'goal', 'frequency', 'strength', 'cardio'];

export default function Onboarding() {
  const { c } = usePalette();
  const router = useRouter();
  const { apply } = useStore();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const [step, setStep] = useState<Step>('intro');
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [frequency, setFrequency] = useState(3);
  const [squatW, setSquatW] = useState(60);
  const [squatR, setSquatR] = useState(5);
  const [benchW, setBenchW] = useState(40);
  const [benchR, setBenchR] = useState(5);
  const [deadW, setDeadW] = useState(80);
  const [deadR, setDeadR] = useState(5);
  const [pace, setPace] = useState(360);

  const stepIndex = ORDER.indexOf(step);

  const preview = useMemo(() => {
    const baseline: Baseline = {
      squat: { weightKg: squatW, reps: squatR },
      bench: { weightKg: benchW, reps: benchR },
      deadlift: { weightKg: deadW, reps: deadR },
      paceSecPerKm: pace,
    };
    return generateProgram(goal, frequency, baseline);
  }, [goal, frequency, squatW, squatR, benchW, benchR, deadW, deadR, pace]);

  const print = () => {
    setStep('printing');
    const delay = reduced ? 200 : 1700;
    setTimeout(() => {
      apply((prev) => ({ ...prev, program: preview, logs: [] }));
      router.replace('/');
    }, delay);
  };

  const goals: { key: Goal; blurb: string }[] = [
    { key: 'strength', blurb: 'Heavy triples and fives. Long rests. The bar goes up.' },
    { key: 'hypertrophy', blurb: 'Eights to twelves. Moderate rests. Build the frame.' },
    { key: 'health', blurb: 'Higher reps, easy miles. Show up, feel better.' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: layout.gutter,
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.lg,
        }}
      >
        {/* header: back + progress */}
        {step !== 'intro' && step !== 'printing' && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="back"
              onPress={() => setStep(ORDER[Math.max(0, stepIndex - 1)])}
              style={{ width: 44, height: 44, justifyContent: 'center' }}
            >
              <IconArrowLeft size={22} color={c.ink} />
            </PressableScale>
            <AppText v="label" color={c.inkSoft}>
              {String(stepIndex).padStart(2, '0')} / 04
            </AppText>
          </View>
        )}

        {step === 'intro' && (
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {/* ring art lives above the text block, not behind it */}
              <View style={{ position: 'absolute', top: -space.xl, right: -space.hero, opacity: 0.7 }}>
                <TrackRings size={Math.min(340, height * 0.4)} color={c.cardio} faint={c.lineFaint} />
              </View>
              <Animated.View entering={reduced ? FadeIn : FadeInDown.springify().damping(16)}>
                <AppText v="label" color={c.strength} style={{ marginBottom: space.sm }}>
                  A training paper · est. {new Date().getFullYear()}
                </AppText>
                <AppText v="hero" style={{ fontSize: 92, lineHeight: 86 }}>
                  Hybrid
                </AppText>
                <AppText v="serif" color={c.inkSoft} style={{ marginTop: space.md, fontSize: 19, lineHeight: 27, maxWidth: 340 }}>
                  One log for the iron and the road. Every session is a race against the last one.
                </AppText>
              </Animated.View>
            </View>
            <View style={{ gap: space.md }}>
              <Marquee text="LIFT · RUN · LOG · BEAT YOUR LAST SELF" color={c.inkFaint} />
              <BlockButton label="Start the block" onPress={() => setStep('goal')} />
            </View>
          </Animated.View>
        )}

        {step === 'goal' && (
          <Animated.View key="goal" entering={FadeInDown.duration(motion.base)} style={{ flex: 1 }}>
            <AppText v="display" style={{ marginBottom: 4 }}>
              What are we building?
            </AppText>
            <AppText v="serif" color={c.inkSoft} style={{ marginBottom: space.xl }}>
              This sets your rep ranges, rests and running intensity for the next three months.
            </AppText>
            <View style={{ gap: space.md }}>
              {goals.map(({ key, blurb }) => {
                const active = goal === key;
                return (
                  <PressableScale
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setGoal(key)}
                    style={{
                      borderWidth: layout.rule,
                      borderColor: active ? c.ink : c.lineFaint,
                      backgroundColor: active ? c.paperRaised : 'transparent',
                      padding: space.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText v="title" color={active ? c.ink : c.inkSoft}>
                        {GOAL_PARAMS[key].label}
                      </AppText>
                      <AppText v="label" color={active ? c.strength : c.inkFaint}>
                        {GOAL_PARAMS[key].sets}×{GOAL_PARAMS[key].repRange.join('–')}
                      </AppText>
                    </View>
                    <AppText v="body" color={c.inkSoft} style={{ marginTop: 4, fontSize: 15, lineHeight: 20 }}>
                      {blurb}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
            <BlockButton label="Next — frequency" onPress={() => setStep('frequency')} />
          </Animated.View>
        )}

        {step === 'frequency' && (
          <Animated.View key="freq" entering={FadeInDown.duration(motion.base)} style={{ flex: 1 }}>
            <AppText v="display" style={{ marginBottom: 4 }}>
              Days per week?
            </AppText>
            <AppText v="serif" color={c.inkSoft} style={{ marginBottom: space.xl }}>
              Your rotation advances when you train, not when the calendar says so. Skip a day — it waits.
            </AppText>
            <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.xl }}>
              {[2, 3, 4, 5].map((n) => {
                const active = frequency === n;
                return (
                  <PressableScale
                    key={n}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setFrequency(n)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderWidth: layout.rule,
                      borderColor: active ? c.ink : c.lineFaint,
                      backgroundColor: active ? c.ink : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText v="display" color={active ? c.paper : c.inkSoft} style={{ fontSize: 40, lineHeight: 44 }}>
                      {n}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            <AppText v="label" color={c.inkSoft} style={{ marginBottom: space.sm }}>
              Your rotation
            </AppText>
            <View style={{ gap: 2 }}>
              {preview.workouts.map((w) => {
                const tint = w.domain === 'cardio' ? c.cardio : c.strength;
                return (
                  <Animated.View
                    key={`${frequency}-${w.key}`}
                    entering={FadeInDown.delay(60 * preview.workouts.indexOf(w)).duration(motion.base)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineFaint }}
                  >
                    <View style={{ width: 34, height: 34, borderWidth: 2, borderColor: tint, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText v="title" color={tint} style={{ fontSize: 18 }}>
                        {w.key}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText v="title" style={{ fontSize: 17 }}>
                        {w.title}
                      </AppText>
                      <AppText v="label" color={c.inkFaint} style={{ fontSize: 10 }}>
                        {w.focus}
                      </AppText>
                    </View>
                    {w.domain === 'cardio' ? <IconTrack size={20} color={tint} /> : <IconBarbell size={20} color={tint} />}
                  </Animated.View>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
            <BlockButton label="Next — baselines" onPress={() => setStep('strength')} />
          </Animated.View>
        )}

        {step === 'strength' && (
          <Animated.View key="str" entering={FadeInDown.duration(motion.base)} style={{ flex: 1 }}>
            <AppText v="display" style={{ marginBottom: 4 }}>
              Where's the bar now?
            </AppText>
            <AppText v="serif" color={c.inkSoft} style={{ marginBottom: space.lg }}>
              Best recent set for the anchors — or your honest guess. The coach derives every other lift from these and corrects itself within two sessions.
            </AppText>
            <View style={{ gap: space.lg }}>
              {(
                [
                  ['Back Squat', squatW, setSquatW, squatR, setSquatR],
                  ['Bench Press', benchW, setBenchW, benchR, setBenchR],
                  ['Deadlift', deadW, setDeadW, deadR, setDeadR],
                ] as const
              ).map(([name, w, setW, r, setR]) => (
                <View key={name}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
                    <IconBarbell size={18} color={c.strength} />
                    <AppText v="title">{name}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: space.md }}>
                    <Stepper label="kg" value={w} onChange={setW} step={2.5} min={20} max={400} width={88} />
                    <Stepper label="reps" value={r} onChange={setR} step={1} min={1} max={20} width={64} />
                  </View>
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <BlockButton label="Next — the road" onPress={() => setStep('cardio')} />
          </Animated.View>
        )}

        {step === 'cardio' && (
          <Animated.View key="car" entering={FadeInDown.duration(motion.base)} style={{ flex: 1 }}>
            <AppText v="display" style={{ marginBottom: 4 }}>
              Comfortable pace?
            </AppText>
            <AppText v="serif" color={c.inkSoft} style={{ marginBottom: space.xl }}>
              The pace you could hold for half an hour while unhappy about it. Runs are prescribed from here.
            </AppText>
            <View style={{ alignItems: 'center', gap: space.md, marginVertical: space.lg }}>
              <IconTrack size={40} color={c.cardio} />
              <Stepper
                label="min / km"
                value={pace}
                onChange={setPace}
                step={15}
                min={180}
                max={720}
                width={120}
                format={(v) => fmtPace(v)}
              />
              <AppText v="mono" color={c.inkFaint}>
                ≈ {fmtPace(pace * 1.60934)} / mile
              </AppText>
            </View>
            <View style={{ flex: 1 }} />
            <BlockButton label="Print my program" color={c.strength} onPress={print} />
          </Animated.View>
        )}

        {step === 'printing' && (
          <Animated.View key="printing" entering={FadeIn.duration(150)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl }}>
            <PrintingStamp color={c.strength} paper={c.paper} />
            <AppText v="serif" color={c.inkSoft}>
              Setting the type…
            </AppText>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function PrintingStamp({ color, paper }: { color: string; paper: string }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  React.useEffect(() => {
    if (!reduced) v.value = withSpring(1, motion.spring);
  }, [v, reduced]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value * 1.5),
    transform: [{ scale: 2 - v.value }, { rotate: `${-12 + v.value * 6}deg` }],
  }));
  return (
    <Animated.View style={st}>
      <View style={{ borderWidth: 4, borderColor: color, paddingHorizontal: 22, paddingVertical: 10, backgroundColor: paper, transform: [{ rotate: '-5deg' }] }}>
        <AppText v="display" color={color} style={{ fontSize: 40, lineHeight: 44, letterSpacing: 2, fontFamily: fonts.display }}>
          Program printed
        </AppText>
      </View>
    </Animated.View>
  );
}
