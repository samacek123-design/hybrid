/**
 * History — the ledger. A data-dense page that reads like printed race
 * results: mono columns, hard rules, outcome marks. Typography does the
 * work; motion stays out of the way.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Rule } from '@/components/ui/Bits';
import { IconLedger } from '@/components/ui/Icons';
import { Screen } from '@/components/ui/Screen';
import { fmtPace } from '@/lib/engine';
import { useStore } from '@/lib/store';
import type { SlotResult } from '@/lib/types';
import { fonts, motion, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

const OUTCOME_MARK: Record<SlotResult['outcome'], string> = {
  beat: '▲',
  hit: '●',
  held: '■',
  missed: '▽',
};

export default function History() {
  const { c } = usePalette();
  const { state } = useStore();
  const program = state.program;

  const groups = useMemo(() => {
    const byMonth = new Map<string, typeof state.logs>();
    for (const log of [...state.logs].reverse()) {
      const d = new Date(log.date);
      const key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(log);
    }
    return [...byMonth.entries()];
  }, [state.logs]);

  const outcomeColor = (r: SlotResult) =>
    r.isPr ? c.gold : r.outcome === 'beat' ? (r.domain === 'cardio' ? c.cardio : c.strength) : r.outcome === 'missed' ? c.inkFaint : c.ink;

  return (
    <Screen>
      <AppText v="label" color={c.inkSoft}>
        every session, in ink
      </AppText>
      <AppText v="hero" style={{ fontSize: 44, lineHeight: 46, marginTop: 2 }}>
        The ledger
      </AppText>
      <Rule style={{ marginTop: space.md, marginBottom: space.sm }} />

      {/* legend */}
      <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.lg, flexWrap: 'wrap' }}>
        {(
          [
            ['▲ beat', c.strength],
            ['● hit', c.ink],
            ['■ held', c.ink],
            ['▽ missed', c.inkFaint],
            ['★ PR', c.gold],
          ] as const
        ).map(([label, tint]) => (
          <AppText key={label} v="label" color={tint} style={{ fontSize: 10 }}>
            {label}
          </AppText>
        ))}
      </View>

      {state.logs.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: space.hero, gap: space.md }}>
          <IconLedger size={40} color={c.inkFaint} />
          <AppText v="title" color={c.inkSoft}>
            Nothing printed yet
          </AppText>
          <AppText v="serif" center color={c.inkFaint} style={{ maxWidth: 280 }}>
            Complete your first session on the Today card and it lands here, in permanent ink.
          </AppText>
        </View>
      ) : (
        groups.map(([month, logs]) => (
          <View key={month} style={{ marginBottom: space.lg }}>
            <AppText v="label" color={c.inkSoft} style={{ marginBottom: space.sm }}>
              {month} — {logs.length} session{logs.length === 1 ? '' : 's'}
            </AppText>
            {logs.map((log, i) => {
              const d = new Date(log.date);
              const domain = program?.workouts.find((w) => w.key === log.workoutKey)?.domain ?? 'strength';
              const tint = domain === 'cardio' ? c.cardio : c.strength;
              const prCount = log.results.filter((r) => r.isPr).length;
              return (
                <Animated.View
                  key={log.id}
                  entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(motion.base)}
                  style={{ borderBottomWidth: 1, borderBottomColor: c.lineFaint, paddingVertical: space.sm }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ width: 44, alignItems: 'center' }}>
                      <AppText v="monoBig" style={{ fontSize: 20, lineHeight: 24 }}>
                        {String(d.getDate()).padStart(2, '0')}
                      </AppText>
                      <AppText v="label" color={c.inkFaint} style={{ fontSize: 9 }}>
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      </AppText>
                    </View>
                    <View style={{ width: 26, height: 26, borderWidth: 2, borderColor: tint, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText v="title" color={tint} style={{ fontSize: 14, lineHeight: 16 }}>
                        {log.workoutKey}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText v="title" style={{ fontSize: 16 }}>
                          {log.workoutTitle}
                        </AppText>
                        {prCount > 0 && (
                          <AppText v="label" color={c.gold} style={{ fontSize: 10 }}>
                            ★ {prCount} PR{prCount > 1 ? 's' : ''}
                          </AppText>
                        )}
                      </View>
                      {log.results.map((r) => {
                        const slotName = program?.slots[r.slotId]?.name ?? r.slotId;
                        const detail =
                          r.domain === 'strength'
                            ? `${r.sets.length}×${Math.max(...r.sets.map((s) => s.reps), 0)} @ ${r.prescribedWeightKg} kg`
                            : `${r.distanceKm.toFixed(1)} km @ ${fmtPace(r.paceSecPerKm)}/km`;
                        return (
                          <View key={r.slotId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <AppText v="mono" color={outcomeColor(r)} numberOfLines={1} style={{ fontSize: 12, lineHeight: 19, flex: 1, marginRight: 8 }}>
                              {OUTCOME_MARK[r.outcome]} {r.isPr ? '★ ' : ''}
                              {slotName}
                            </AppText>
                            <AppText v="mono" color={c.inkSoft} numberOfLines={1} style={{ fontSize: 12, lineHeight: 19, fontFamily: fonts.mono }}>
                              {detail}
                            </AppText>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}
