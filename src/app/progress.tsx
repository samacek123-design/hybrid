/**
 * Progress — the emotional payoff. Editorial data-viz: the 3-month arc,
 * the weekly target card (visibly incomplete until hit), a consistency
 * grid, and hand-drawn trend lines per anchor lift and run.
 */
import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Polyline, Line as SvgLine } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { Rule, Tally } from '@/components/ui/Bits';
import { IconTrend } from '@/components/ui/Icons';
import { Screen } from '@/components/ui/Screen';
import { blockProgress, fmtPace, sessionsThisWeek, startOfWeek, weeksInBlock } from '@/lib/engine';
import { useStore } from '@/lib/store';
import type { SessionLog } from '@/lib/types';
import { fonts, layout, motion, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

/** editorial sparkline: thin ink line, dot on the latest point, mono deltas */
function TrendLine({
  points,
  color,
  height = 64,
  width = 280,
  faint,
}: {
  points: number[];
  color: string;
  faint: string;
  height?: number;
  width?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 8;
  const xy = points.map((p, i) => [
    pad + (i / (points.length - 1)) * (width - pad * 2),
    height - pad - ((p - min) / range) * (height - pad * 2),
  ]);
  const last = xy[xy.length - 1];
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgLine x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={faint} strokeWidth={1} />
      <Polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} stroke={color} strokeWidth={2} fill="none" />
      {xy.slice(0, -1).map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2.5} fill={color} />
      ))}
      <Circle cx={last[0]} cy={last[1]} r={5} fill={color} />
    </Svg>
  );
}

interface Trend {
  name: string;
  domain: 'strength' | 'cardio';
  points: number[];
  first: number;
  latest: number;
}

function collectTrends(logs: SessionLog[], slots: Record<string, { name: string }>): Trend[] {
  const series = new Map<string, { domain: 'strength' | 'cardio'; points: number[] }>();
  for (const log of logs) {
    for (const r of log.results) {
      const name = slots[r.slotId]?.name ?? r.slotId;
      if (!series.has(name)) series.set(name, { domain: r.domain, points: [] });
      if (r.domain === 'strength') series.get(name)!.points.push(Math.round(r.est1Rm * 10) / 10);
      else if (isFinite(r.paceSecPerKm)) series.get(name)!.points.push(Math.round(r.paceSecPerKm));
    }
  }
  return [...series.entries()]
    .filter(([, s]) => s.points.length >= 2)
    .map(([name, s]) => ({ name, domain: s.domain, points: s.points, first: s.points[0], latest: s.points[s.points.length - 1] }));
}

export default function Progress() {
  const { c } = usePalette();
  const { state } = useStore();
  const { width: winW } = useWindowDimensions();
  const chartW = Math.min(winW, layout.maxWidth) - layout.gutter * 2 - 4;
  const program = state.program;

  const trends = useMemo(
    () => (program ? collectTrends(state.logs, program.slots) : []),
    [state.logs, program],
  );

  if (!program) {
    return (
      <Screen>
        <AppText v="hero" style={{ fontSize: 44, lineHeight: 46 }}>
          The arc
        </AppText>
        <Rule style={{ marginTop: space.md, marginBottom: space.lg }} />
        <AppText v="serif" color={c.inkSoft}>
          No block in progress. Head to the Today tab to print a program.
        </AppText>
      </Screen>
    );
  }

  const now = new Date();
  const totalWeeks = weeksInBlock(program);
  const week = Math.min(totalWeeks, Math.floor((now.getTime() - new Date(program.startedAt).getTime()) / (7 * 24 * 3600 * 1000)) + 1);
  const pct = blockProgress(program, now);
  const doneThisWeek = sessionsThisWeek(state.logs, now);
  const weekComplete = doneThisWeek >= program.frequency;
  const totalPrs = state.logs.reduce((acc, l) => acc + l.results.filter((r) => r.isPr).length, 0);

  // consistency grid: sessions per block week
  const weekCounts: number[] = Array.from({ length: totalWeeks }, () => 0);
  const blockStartMonday = startOfWeek(new Date(program.startedAt)).getTime();
  for (const log of state.logs) {
    const idx = Math.floor((new Date(log.date).getTime() - blockStartMonday) / (7 * 24 * 3600 * 1000));
    if (idx >= 0 && idx < totalWeeks) weekCounts[idx]++;
  }

  return (
    <Screen>
      <AppText v="label" color={c.inkSoft}>
        the three-month block
      </AppText>
      <AppText v="hero" style={{ fontSize: 44, lineHeight: 46, marginTop: 2 }}>
        The arc
      </AppText>
      <Rule style={{ marginTop: space.md, marginBottom: space.lg }} />

      {/* block position — oversized editorial numeral */}
      <Animated.View entering={FadeInDown.duration(motion.base)}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <AppText v="hero" style={{ fontSize: 96, lineHeight: 92 }}>
            {String(week).padStart(2, '0')}
          </AppText>
          <View style={{ paddingBottom: 10 }}>
            <AppText v="label" color={c.inkSoft}>
              of {totalWeeks} weeks
            </AppText>
            <AppText v="serif" color={c.inkSoft} style={{ fontSize: 15 }}>
              {pct >= 1 ? 'Block complete — reprint in Profile.' : `${Math.round(pct * 100)}% of the arc behind you.`}
            </AppText>
          </View>
        </View>
        {/* segmented block bar */}
        <View style={{ flexDirection: 'row', gap: 3, marginTop: space.md }}>
          {Array.from({ length: totalWeeks }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 10,
                backgroundColor: i < week - 1 ? c.ink : i === week - 1 ? c.strength : 'transparent',
                borderWidth: i >= week ? 1 : 0,
                borderColor: c.lineFaint,
              }}
            />
          ))}
        </View>
      </Animated.View>

      {/* weekly target card — the unfinished state */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(motion.base)}
        style={{
          marginTop: space.xl,
          borderWidth: layout.rule,
          borderColor: weekComplete ? c.success : c.line,
          backgroundColor: c.paperRaised,
          padding: space.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: space.md }}>
            <AppText v="label" color={weekComplete ? c.success : c.strength}>
              {weekComplete ? 'week complete' : 'this week — unfinished'}
            </AppText>
            <AppText v="display" style={{ fontSize: 26, lineHeight: 30, marginTop: 2 }}>
              {Math.min(doneThisWeek, program.frequency)} of {program.frequency} sessions
            </AppText>
            <AppText v="serif" color={c.inkSoft} style={{ fontSize: 14, marginTop: 4 }}>
              {weekComplete
                ? doneThisWeek > program.frequency
                  ? `Target hit, plus ${doneThisWeek - program.frequency} extra. The tally stands until Monday.`
                  : 'Target hit. The tally stands until Monday.'
                : `${program.frequency - doneThisWeek} more before Monday and the week is yours.`}
            </AppText>
          </View>
          <Tally count={Math.min(doneThisWeek, program.frequency)} total={program.frequency} color={weekComplete ? c.success : c.ink} />
        </View>
      </Animated.View>

      {/* headline counters */}
      <Animated.View entering={FadeInDown.delay(140).duration(motion.base)} style={{ flexDirection: 'row', marginTop: space.xl }}>
        {(
          [
            [String(state.logs.length), 'sessions logged'],
            [String(totalPrs), 'records set'],
            [String(Math.max(0, totalWeeks - week)), 'weeks left'],
          ] as const
        ).map(([num, label], i) => (
          <View key={label} style={{ flex: 1, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: c.lineFaint, alignItems: 'center', gap: 2 }}>
            <AppText v="monoBig" style={{ fontSize: 32, lineHeight: 36 }} color={label === 'records set' && totalPrs > 0 ? c.gold : c.ink}>
              {num}
            </AppText>
            <AppText v="label" color={c.inkFaint} style={{ fontSize: 9 }}>
              {label}
            </AppText>
          </View>
        ))}
      </Animated.View>

      {/* consistency grid */}
      <Animated.View entering={FadeInDown.delay(200).duration(motion.base)} style={{ marginTop: space.xl }}>
        <AppText v="label" color={c.inkSoft} style={{ marginBottom: space.sm }}>
          consistency — sessions per week
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {weekCounts.map((count, i) => {
            const future = i >= week;
            const full = count >= program.frequency;
            return (
              <View key={i} style={{ alignItems: 'center', gap: 3 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: full ? c.ink : 'transparent',
                    borderWidth: 1.5,
                    borderColor: future ? c.lineFaint : full ? c.ink : count > 0 ? c.ink : c.lineFaint,
                    borderStyle: future ? 'dashed' : 'solid',
                  }}
                >
                  <AppText v="mono" color={full ? c.paper : future ? c.inkFaint : c.ink} style={{ fontSize: 12 }}>
                    {future ? '·' : count}
                  </AppText>
                </View>
                <AppText v="label" color={c.inkFaint} style={{ fontSize: 8 }}>
                  w{i + 1}
                </AppText>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* trends */}
      <Animated.View entering={FadeInDown.delay(260).duration(motion.base)} style={{ marginTop: space.xl }}>
        <AppText v="label" color={c.inkSoft} style={{ marginBottom: space.sm }}>
          the race against your last self
        </AppText>
        {trends.length === 0 ? (
          <View style={{ borderWidth: 1.5, borderColor: c.lineFaint, padding: space.lg, alignItems: 'center', gap: space.sm }}>
            <IconTrend size={28} color={c.inkFaint} />
            <AppText v="serif" center color={c.inkFaint} style={{ maxWidth: 300 }}>
              Trends appear once a slot has come around twice — two points make a line.
            </AppText>
          </View>
        ) : (
          trends.map((t) => {
            const tint = t.domain === 'cardio' ? c.cardio : c.strength;
            const better = t.domain === 'cardio' ? t.latest < t.first : t.latest > t.first;
            const delta =
              t.domain === 'cardio'
                ? `${fmtPace(t.first)} → ${fmtPace(t.latest)}/km`
                : `${t.first.toFixed(0)} → ${t.latest.toFixed(0)} kg e1RM`;
            return (
              <View key={t.name} style={{ borderBottomWidth: 1, borderBottomColor: c.lineFaint, paddingVertical: space.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <AppText v="title" style={{ fontSize: 17 }}>
                    {t.name}
                  </AppText>
                  <AppText v="mono" color={better ? tint : c.inkSoft} style={{ fontSize: 12, fontFamily: better ? fonts.monoBold : fonts.mono }}>
                    {delta}
                  </AppText>
                </View>
                <TrendLine points={t.points} color={tint} faint={c.lineFaint} width={chartW} />
              </View>
            );
          })
        )}
      </Animated.View>
    </Screen>
  );
}
