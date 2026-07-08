/**
 * Profile / Program settings — deliberately the calmest page in the app.
 * Quiet rows, small type, no theatrics: restraint as contrast.
 */
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BlockButton, GhostButton, Rule } from '@/components/ui/Bits';
import { IconArrowRight, IconGear, IconPaper } from '@/components/ui/Icons';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { GOAL_PARAMS, baselineFromProgram, fmtPace, generateProgram, weeksInBlock } from '@/lib/engine';
import { useStore } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { layout, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

export default function Profile() {
  const { c } = usePalette();
  const { state, apply, reset } = useStore();
  const program = state.program;
  const [goal, setGoal] = useState<Goal | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!program) {
    return (
      <Screen>
        <AppText v="hero" style={{ fontSize: 44, lineHeight: 46 }}>
          Program
        </AppText>
        <Rule style={{ marginTop: space.md, marginBottom: space.lg }} />
        <AppText v="serif" color={c.inkSoft}>
          Nothing to configure yet — print a program from the Today tab.
        </AppText>
      </Screen>
    );
  }

  const effGoal = goal ?? program.goal;
  const effFreq = frequency ?? program.frequency;
  const dirty = effGoal !== program.goal || effFreq !== program.frequency;
  const baseline = baselineFromProgram(program);

  const reprint = () => {
    apply((prev) => {
      if (!prev.program) return prev;
      const b = baselineFromProgram(prev.program);
      const next = generateProgram(effGoal, effFreq, b, new Date(), {
        sessionMinutes: prev.program.sessionMinutes,
        equipment: prev.program.equipment,
        physiqueRef: prev.program.physiqueRef,
      });
      // a reprint continues the same block clock, it doesn't restart it
      return {
        ...prev,
        program: { ...next, startedAt: prev.program.startedAt, blockEndsAt: prev.program.blockEndsAt },
      };
    });
    setGoal(null);
    setFrequency(null);
  };

  const row = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.lineFaint }}>
      <AppText v="label" color={c.inkSoft}>
        {label}
      </AppText>
      <AppText v="mono" style={{ fontSize: 13 }}>
        {value}
      </AppText>
    </View>
  );

  return (
    <Screen>
      <AppText v="label" color={c.inkSoft}>
        the fine print
      </AppText>
      <AppText v="hero" style={{ fontSize: 44, lineHeight: 46, marginTop: 2 }}>
        Program
      </AppText>
      <Rule style={{ marginTop: space.md, marginBottom: space.lg }} />

      {/* current block facts */}
      {row('block started', new Date(program.startedAt).toLocaleDateString())}
      {row('block ends', new Date(program.blockEndsAt).toLocaleDateString())}
      {row('length', `${weeksInBlock(program)} weeks`)}
      {row('rotation', program.workouts.map((w) => w.key).join(' · '))}
      {row('baseline pace', `${fmtPace(baseline.paceSecPerKm)}/km`)}

      {/* goal */}
      <AppText v="label" color={c.inkSoft} style={{ marginTop: space.xl, marginBottom: space.sm }}>
        goal
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {(Object.keys(GOAL_PARAMS) as Goal[]).map((g) => {
          const active = effGoal === g;
          return (
            <PressableScale
              key={g}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setGoal(g)}
              style={{
                flex: 1,
                borderWidth: layout.rule,
                borderColor: active ? c.ink : c.lineFaint,
                backgroundColor: active ? c.ink : 'transparent',
                paddingVertical: 10,
                alignItems: 'center',
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <AppText v="title" color={active ? c.paper : c.inkSoft} style={{ fontSize: 13 }}>
                {GOAL_PARAMS[g].label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      {/* frequency */}
      <AppText v="label" color={c.inkSoft} style={{ marginTop: space.lg, marginBottom: space.sm }}>
        days per week
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[2, 3, 4, 5].map((n) => {
          const active = effFreq === n;
          return (
            <PressableScale
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setFrequency(n)}
              style={{
                flex: 1,
                borderWidth: layout.rule,
                borderColor: active ? c.ink : c.lineFaint,
                backgroundColor: active ? c.ink : 'transparent',
                paddingVertical: 10,
                alignItems: 'center',
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <AppText v="title" color={active ? c.paper : c.inkSoft} style={{ fontSize: 15 }}>
                {n}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      {dirty && (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <AppText v="serif" color={c.inkSoft} style={{ fontSize: 14 }}>
            Reprinting rebuilds the rotation at your current strength. The ledger and the block clock stay.
          </AppText>
          <BlockButton small label="Reprint program" onPress={reprint} />
        </View>
      )}

      {/* settings link */}
      <AppText v="label" color={c.inkSoft} style={{ marginTop: space.xl, marginBottom: space.sm }}>
        preferences
      </AppText>
      <Link href="/settings" asChild>
        <PressableScale
          accessibilityRole="link"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: layout.rule,
            borderColor: c.line,
            padding: space.md,
            minHeight: 44,
            marginBottom: space.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconGear size={20} color={c.ink} />
            <View>
              <AppText v="title" style={{ fontSize: 16 }}>
                Settings
              </AppText>
              <AppText v="label" color={c.inkFaint} style={{ fontSize: 9 }}>
                theme + AI coach connection
              </AppText>
            </View>
          </View>
          <IconArrowRight size={18} color={c.ink} />
        </PressableScale>
      </Link>

      {/* guide link */}
      <AppText v="label" color={c.inkSoft} style={{ marginTop: space.xl, marginBottom: space.sm }}>
        about
      </AppText>
      <Link href="/guide" asChild>
        <PressableScale
          accessibilityRole="link"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: layout.rule,
            borderColor: c.line,
            padding: space.md,
            minHeight: 44,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <IconPaper size={20} color={c.ink} />
            <View>
              <AppText v="title" style={{ fontSize: 16 }}>
                How this was made
              </AppText>
              <AppText v="label" color={c.inkFaint} style={{ fontSize: 9 }}>
                design + build methodology
              </AppText>
            </View>
          </View>
          <IconArrowRight size={18} color={c.ink} />
        </PressableScale>
      </Link>

      {/* danger */}
      <AppText v="label" color={c.danger} style={{ marginTop: space.xl, marginBottom: space.sm }}>
        danger
      </AppText>
      {confirmReset ? (
        <View style={{ gap: space.sm, borderWidth: layout.rule, borderColor: c.danger, padding: space.md }}>
          <AppText v="serif" color={c.inkSoft} style={{ fontSize: 14 }}>
            This erases the program and every logged session. There is no undo.
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <GhostButton label="Keep it" onPress={() => setConfirmReset(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <BlockButton small label="Erase all" color={c.danger} onPress={() => { setConfirmReset(false); reset(); }} />
            </View>
          </View>
        </View>
      ) : (
        <GhostButton label="Reset everything" color={c.danger} onPress={() => setConfirmReset(true)} />
      )}

      <AppText v="label" center color={c.inkFaint} style={{ marginTop: space.xl, fontSize: 9 }}>
        hybrid · a training paper · all data lives on this device
      </AppText>
    </Screen>
  );
}
