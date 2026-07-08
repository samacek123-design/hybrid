/**
 * Today / Log — the core loop. Everything is prefilled from the
 * prescription so a session that goes to plan is: tap ✓ per set, Complete.
 * Under thirty seconds, then the reward moment.
 */
import { Redirect } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { RewardOverlay, type RewardSummary } from '@/components/RewardOverlay';
import { AppText } from '@/components/ui/AppText';
import { BlockButton, Rule, Stepper, Tally } from '@/components/ui/Bits';
import { IconBarbell, IconCheck, IconTimer, IconTrack } from '@/components/ui/Icons';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import {
  completeSession,
  fmtDuration,
  fmtPace,
  sessionsThisWeek,
  weeksInBlock,
  type CardioEntry,
  type StrengthEntry,
} from '@/lib/engine';
import { useStore } from '@/lib/store';
import type { CardioSlot, SessionLog, StrengthSlot } from '@/lib/types';
import { fonts, space } from '@/theme/tokens';
import { motion } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

interface SetDraft {
  weightKg: number;
  reps: number;
  done: boolean;
}

function lastResultFor(logs: SessionLog[], slotId: string) {
  for (let i = logs.length - 1; i >= 0; i--) {
    const r = logs[i].results.find((x) => x.slotId === slotId);
    if (r) return r;
  }
  return null;
}

const COACH: Record<string, string> = {
  first: 'First time on this card. Set the mark — everything after this is a race.',
  beat: 'You beat this last time, so the bar is heavier today. Earn it again.',
  hit: 'Solid last outing. A small bump — same honest work.',
  held: 'Same target as last time. You held it once; now win it.',
  missed: 'We took five percent off. Rebuild the base, then come back up.',
};

const VERDICT_COACH: Record<RewardSummary['verdict'], string> = {
  PR: 'A lifetime best. The paper remembers this one.',
  BEAT: 'You beat your last self. Next time the target moves up.',
  HIT: 'Target met. The coach nudges the bar for next round.',
  HELD: 'You held the line. Same prescription — take it next time.',
  LOGGED: 'Rough day, logged honestly. The target eases; the block goes on.',
};

export default function Today() {
  const { c } = usePalette();
  const { state, ready, apply } = useStore();
  const [reward, setReward] = useState<RewardSummary | null>(null);

  const program = state.program;
  const workout = program ? program.workouts[program.cursor % program.workouts.length] : null;

  const strengthSlots = useMemo(
    () =>
      workout && program
        ? (workout.slotIds.map((id) => program.slots[id]).filter((s) => s?.domain === 'strength') as StrengthSlot[])
        : [],
    [workout, program],
  );
  const cardioSlots = useMemo(
    () =>
      workout && program
        ? (workout.slotIds.map((id) => program.slots[id]).filter((s) => s?.domain === 'cardio') as CardioSlot[])
        : [],
    [workout, program],
  );

  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({});
  const [cardioDraft, setCardioDraft] = useState<
    Record<string, { distanceKm: number; durationSec: number; logged: boolean }>
  >({});
  const [timer, setTimer] = useState<{ slotId: string; startedAt: number; elapsed: number } | null>(null);

  // (re)seed drafts whenever the workout changes
  const workoutSig = `${program?.id}-${program?.cursor}`;
  const [sig, setSig] = useState('');
  if (sig !== workoutSig && program) {
    setSig(workoutSig);
    const d: Record<string, SetDraft[]> = {};
    for (const s of strengthSlots) {
      d[s.id] = Array.from({ length: s.sets }, () => ({ weightKg: s.weightKg, reps: s.repRange[1], done: false }));
    }
    setDrafts(d);
    const cd: typeof cardioDraft = {};
    for (const s of cardioSlots) {
      cd[s.id] = { distanceKm: s.distanceKm, durationSec: s.targetSec, logged: false };
    }
    setCardioDraft(cd);
    setTimer(null);
  }

  if (!ready) return <Screen nav={false}>{null}</Screen>;
  if (!program || !workout) return <Redirect href="/onboarding" />;

  const now = new Date();
  const week = Math.min(
    weeksInBlock(program),
    Math.floor((now.getTime() - new Date(program.startedAt).getTime()) / (7 * 24 * 3600 * 1000)) + 1,
  );
  const done = sessionsThisWeek(state.logs, now);
  const domainTint = workout.domain === 'cardio' ? c.cardio : c.strength;
  const anyLogged =
    Object.values(drafts).some((sets) => sets.some((s) => s.done)) ||
    Object.values(cardioDraft).some((d) => d.logged);

  const toggleSet = (slotId: string, idx: number) => {
    setDrafts((prev) => ({
      ...prev,
      [slotId]: prev[slotId].map((s, i) => (i === idx ? { ...s, done: !s.done } : s)),
    }));
  };
  const editSet = (slotId: string, idx: number, patch: Partial<SetDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [slotId]: prev[slotId].map((s, i) => (i === idx ? { ...s, ...patch, done: true } : s)),
    }));
  };

  const complete = () => {
    const strengthEntries: StrengthEntry[] = strengthSlots
      .map((slot) => ({
        slotId: slot.id,
        sets: (drafts[slot.id] ?? []).filter((s) => s.done).map(({ weightKg, reps }) => ({ weightKg, reps })),
      }))
      .filter((e) => e.sets.length > 0);
    const cardioEntries: CardioEntry[] = cardioSlots
      .filter((slot) => cardioDraft[slot.id]?.logged)
      .map((slot) => ({
        slotId: slot.id,
        distanceKm: cardioDraft[slot.id].distanceKm,
        durationSec: cardioDraft[slot.id].durationSec,
      }));
    if (strengthEntries.length === 0 && cardioEntries.length === 0) return;

    const next = completeSession(state, strengthEntries, cardioEntries);
    const log = next.logs[next.logs.length - 1];
    const anyPr = log.results.some((r) => r.isPr);
    const rank = { beat: 3, hit: 2, held: 1, missed: 0 } as const;
    const best = log.results.reduce<'beat' | 'hit' | 'held' | 'missed'>(
      (acc, r) => (rank[r.outcome] > rank[acc] ? r.outcome : acc),
      'missed',
    );
    const verdict: RewardSummary['verdict'] =
      anyPr ? 'PR' : best === 'beat' ? 'BEAT' : best === 'hit' ? 'HIT' : best === 'held' ? 'HELD' : 'LOGGED';

    const lines = log.results.map((r) => {
      if (r.domain === 'strength') {
        const slot = program.slots[r.slotId] as StrengthSlot;
        const nextW = (next.program!.slots[r.slotId] as StrengthSlot).weightKg;
        const arrow =
          nextW > r.prescribedWeightKg
            ? `${r.prescribedWeightKg} → ${nextW} kg`
            : nextW < r.prescribedWeightKg
              ? `${r.prescribedWeightKg} → ${nextW} kg ↓`
              : `${r.prescribedWeightKg} kg again`;
        return {
          label: (r.isPr ? '★ ' : '') + slot.name,
          detail: arrow,
          good: r.outcome === 'beat' || r.outcome === 'hit' || r.isPr,
        };
      }
      const slot = program.slots[r.slotId] as CardioSlot;
      return {
        label: (r.isPr ? '★ ' : '') + slot.name,
        detail: `${r.distanceKm.toFixed(1)} km @ ${fmtPace(r.paceSecPerKm)}/km`,
        good: r.outcome === 'beat' || r.outcome === 'hit' || r.isPr,
      };
    });

    setReward({ verdict, color: domainTint, lines, coach: VERDICT_COACH[verdict] });
    apply(() => next);
  };

  return (
    <Screen overlay={reward ? <RewardOverlay summary={reward} onDone={() => setReward(null)} /> : null}>
      {/* masthead */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <AppText v="label" color={c.inkSoft}>
            {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · week {week} of{' '}
            {weeksInBlock(program)}
          </AppText>
          <AppText v="hero" style={{ fontSize: 44, lineHeight: 46, marginTop: 2 }}>
            Today's card
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4, paddingBottom: 4 }}>
          <AppText v="label" color={c.inkSoft}>
            this week
          </AppText>
          <Tally count={Math.min(done, program.frequency)} total={program.frequency} color={c.ink} />
        </View>
      </View>
      <Rule style={{ marginTop: space.md, marginBottom: space.lg }} />

      {/* workout header */}
      <Animated.View
        entering={FadeInDown.duration(motion.base)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg }}
      >
        <View style={{ width: 72, height: 72, backgroundColor: domainTint, alignItems: 'center', justifyContent: 'center' }}>
          <AppText v="hero" color={c.paper} style={{ fontSize: 46, lineHeight: 50 }}>
            {workout.key}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText v="display" style={{ fontSize: 30, lineHeight: 32 }}>
            {workout.title}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {workout.domain === 'cardio' ? (
              <IconTrack size={14} color={domainTint} />
            ) : (
              <IconBarbell size={14} color={domainTint} />
            )}
            <AppText v="label" color={domainTint}>
              {workout.focus}
            </AppText>
          </View>
        </View>
      </Animated.View>

      {/* strength slots */}
      <View style={{ gap: space.xl }}>
        {strengthSlots.map((slot, slotIdx) => {
          const last = lastResultFor(state.logs, slot.id);
          const coach = last ? COACH[last.outcome] : COACH.first;
          return (
            <Animated.View key={slot.id} entering={FadeInDown.delay(80 + slotIdx * 60).duration(motion.base)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <AppText v="title" style={{ fontSize: 20 }}>
                  {slot.name}
                </AppText>
                <AppText v="mono" color={c.inkSoft}>
                  {slot.sets}×{slot.repRange.join('–')} @{' '}
                  <AppText v="mono" style={{ fontFamily: fonts.monoBold }}>
                    {slot.weightKg} kg
                  </AppText>
                </AppText>
              </View>
              <AppText v="serif" color={c.inkSoft} style={{ marginTop: 2, marginBottom: space.sm, fontSize: 14, lineHeight: 20 }}>
                {coach}
              </AppText>
              <View style={{ gap: 6 }}>
                {(drafts[slot.id] ?? []).map((set, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: set.done ? c.paperRaised : 'transparent',
                      borderWidth: 1.5,
                      borderColor: set.done ? c.line : c.lineFaint,
                      paddingHorizontal: 6,
                      paddingVertical: 6,
                    }}
                  >
                    <AppText v="mono" color={set.done ? domainTint : c.inkFaint} style={{ width: 22, fontSize: 12 }}>
                      {String(i + 1).padStart(2, '0')}
                    </AppText>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                      <Stepper
                        value={set.weightKg}
                        onChange={(v) => editSet(slot.id, i, { weightKg: v })}
                        step={2.5}
                        min={0}
                        max={500}
                        width={54}
                        buttonWidth={34}
                        format={(v) => `${v}`}
                      />
                      <Stepper
                        value={set.reps}
                        onChange={(v) => editSet(slot.id, i, { reps: v })}
                        step={1}
                        min={0}
                        max={50}
                        width={38}
                        buttonWidth={34}
                      />
                    </View>
                    <PressableScale
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: set.done }}
                      accessibilityLabel={`set ${i + 1} done`}
                      onPress={() => toggleSet(slot.id, i)}
                      style={{
                        width: 44,
                        height: 44,
                        marginLeft: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: set.done ? domainTint : 'transparent',
                        borderWidth: 2,
                        borderColor: set.done ? domainTint : c.line,
                      }}
                    >
                      <IconCheck size={20} color={set.done ? c.paper : c.inkFaint} />
                    </PressableScale>
                  </View>
                ))}
              </View>
            </Animated.View>
          );
        })}

        {/* cardio slots */}
        {cardioSlots.map((slot) => {
          const d = cardioDraft[slot.id] ?? { distanceKm: slot.distanceKm, durationSec: slot.targetSec, logged: false };
          const last = lastResultFor(state.logs, slot.id);
          const coach = last ? COACH[last.outcome] : COACH.first;
          const running = timer?.slotId === slot.id;
          return (
            <Animated.View key={slot.id} entering={FadeInDown.delay(120).duration(motion.base)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <AppText v="title" style={{ fontSize: 20 }}>
                  {slot.name}
                </AppText>
                <AppText v="mono" color={c.inkSoft}>
                  {slot.distanceKm.toFixed(1)} km in{' '}
                  <AppText v="mono" style={{ fontFamily: fonts.monoBold }}>
                    {fmtDuration(slot.targetSec)}
                  </AppText>
                </AppText>
              </View>
              <AppText v="serif" color={c.inkSoft} style={{ marginTop: 2, marginBottom: space.sm, fontSize: 14, lineHeight: 20 }}>
                {coach} Target pace {fmtPace(slot.targetSec / slot.distanceKm)}/km.
              </AppText>

              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: d.logged ? c.line : c.lineFaint,
                  backgroundColor: d.logged ? c.paperRaised : 'transparent',
                  padding: space.md,
                  gap: space.md,
                }}
              >
                {running ? (
                  <View style={{ alignItems: 'center', gap: space.md }}>
                    <AppText v="monoBig" style={{ fontSize: 44, lineHeight: 50 }}>
                      {fmtDuration(timer!.elapsed)}
                    </AppText>
                    <View style={{ width: '100%' }}>
                      <BlockButton
                        small
                        label="End run"
                        color={c.cardio}
                        onPress={() => {
                          setCardioDraft((prev) => ({
                            ...prev,
                            [slot.id]: { ...d, durationSec: Math.max(1, timer!.elapsed), logged: true },
                          }));
                          setTimer(null);
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.md }}>
                      <Stepper
                        label="km"
                        value={d.distanceKm}
                        onChange={(v) => setCardioDraft((p) => ({ ...p, [slot.id]: { ...d, distanceKm: v, logged: true } }))}
                        step={0.25}
                        min={0.25}
                        max={60}
                        width={72}
                        format={(v) => v.toFixed(2)}
                      />
                      <Stepper
                        label="time"
                        value={d.durationSec}
                        onChange={(v) => setCardioDraft((p) => ({ ...p, [slot.id]: { ...d, durationSec: v, logged: true } }))}
                        step={15}
                        min={60}
                        max={4 * 3600}
                        width={88}
                        format={(v) => fmtDuration(v)}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <View style={{ flex: 1 }}>
                        <PressableScale
                          accessibilityRole="button"
                          onPress={() => {
                            const startedAt = Date.now();
                            setTimer({ slotId: slot.id, startedAt, elapsed: 0 });
                            const tick = () => {
                              setTimer((t) => {
                                if (!t || t.slotId !== slot.id) return t;
                                setTimeout(tick, 1000);
                                return { ...t, elapsed: Math.round((Date.now() - t.startedAt) / 1000) };
                              });
                            };
                            setTimeout(tick, 1000);
                          }}
                          style={{
                            borderWidth: 2,
                            borderColor: c.cardio,
                            paddingVertical: 10,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                            minHeight: 44,
                          }}
                        >
                          <IconTimer size={18} color={c.cardio} />
                          <AppText v="title" color={c.cardio} style={{ fontSize: 15 }}>
                            Start run
                          </AppText>
                        </PressableScale>
                      </View>
                      <View style={{ flex: 1 }}>
                        <PressableScale
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: d.logged }}
                          onPress={() => setCardioDraft((p) => ({ ...p, [slot.id]: { ...d, logged: !d.logged } }))}
                          style={{
                            backgroundColor: d.logged ? c.cardio : 'transparent',
                            borderWidth: 2,
                            borderColor: d.logged ? c.cardio : c.line,
                            paddingVertical: 10,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                            minHeight: 44,
                          }}
                        >
                          <IconCheck size={18} color={d.logged ? c.paper : c.ink} />
                          <AppText v="title" color={d.logged ? c.paper : c.ink} style={{ fontSize: 15 }}>
                            {d.logged ? 'Logged' : 'Log it'}
                          </AppText>
                        </PressableScale>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ marginTop: space.xl }}>
        <BlockButton label="Complete session" color={anyLogged ? domainTint : undefined} disabled={!anyLogged} onPress={complete} />
        <AppText v="label" center color={c.inkFaint} style={{ marginTop: space.sm }}>
          {anyLogged
            ? `up next · ${program.workouts[(program.cursor + 1) % program.workouts.length].key} — ${program.workouts[(program.cursor + 1) % program.workouts.length].title}`
            : 'check off at least one set to finish'}
        </AppText>
      </View>

    </Screen>
  );
}
