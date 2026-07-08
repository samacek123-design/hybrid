/**
 * /guide — how this app was designed and built, in plain terms,
 * so the method can be learned from and repeated. The page demonstrates
 * the system it documents: live swatches, type specimens, motion values.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Rule, Stamp } from '@/components/ui/Bits';
import { IconArrowLeft } from '@/components/ui/Icons';
import { PressableScale } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { fonts, motion, space } from '@/theme/tokens';
import { usePalette } from '@/theme/useTheme';

function H({ children }: { children: string }) {
  const { c } = usePalette();
  return (
    <>
      <AppText v="display" style={{ fontSize: 26, lineHeight: 30, marginTop: space.xl }}>
        {children}
      </AppText>
      <Rule style={{ marginTop: 6, marginBottom: space.md }} />
    </>
  );
}

function P({ children }: { children: React.ReactNode }) {
  const { c } = usePalette();
  return (
    <AppText v="body" color={c.inkSoft} style={{ marginBottom: space.md, fontSize: 16, lineHeight: 24 }}>
      {children}
    </AppText>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  const { c } = usePalette();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.lineFaint }}>
      <AppText v="label" color={c.inkSoft}>
        {k}
      </AppText>
      <AppText v="mono" style={{ fontSize: 12, flexShrink: 1, textAlign: 'right' }}>
        {v}
      </AppText>
    </View>
  );
}

export default function Guide() {
  const { c } = usePalette();
  const router = useRouter();

  const swatches: [string, string][] = [
    ['paper', c.paper],
    ['ink', c.ink],
    ['strength', c.strength],
    ['cardio', c.cardio],
    ['gold / PR', c.gold],
  ];

  return (
    <Screen nav={false}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        style={{ width: 44, height: 44, justifyContent: 'center', marginBottom: space.sm }}
      >
        <IconArrowLeft size={22} color={c.ink} />
      </PressableScale>

      <AppText v="label" color={c.inkSoft}>
        the colophon
      </AppText>
      <AppText v="hero" style={{ fontSize: 40, lineHeight: 42, marginTop: 2 }}>
        How this was made
      </AppText>
      <AppText v="serif" color={c.inkSoft} style={{ marginTop: space.sm, fontSize: 16 }}>
        A working log of the design and build method, plain enough to repeat.
      </AppText>

      <H>The brief</H>
      <P>
        One app that merges strength and cardio logging around a single idea: every workout unit is logged against a
        repeatable slot, so each session can be compared to the last time that exact slot came up. Everything else —
        the coach, the charts, the progression — is built on that comparability. The design bar: an award-worthy
        portfolio piece, five distinct screen "moments" inside one coherent system.
      </P>

      <H>Point of view</H>
      <P>
        Fitness apps default to dark mode with neon accents. This one commits to the opposite: an athletic print zine —
        a vintage track-and-field program on warm paper. Ink rules at 2px, zero corner radius, stamp badges, tally
        marks. Training data as something typeset and kept, not streamed and forgotten.
      </P>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        {swatches.map(([name, hex]) => (
          <View key={name} style={{ flex: 1, gap: 4 }}>
            <View style={{ height: 44, backgroundColor: hex, borderWidth: 1, borderColor: c.lineFaint }} />
            <AppText v="label" color={c.inkFaint} style={{ fontSize: 8 }}>
              {name}
            </AppText>
          </View>
        ))}
      </View>
      <P>
        Color is functional before it is decorative: orange means strength, blue means cardio, gold only ever means a
        record. One accent per meaning, everywhere — that is what makes two training domains feel like one app.
      </P>

      <H>Type system</H>
      <View style={{ marginBottom: space.md, gap: 6 }}>
        <AppText v="hero" style={{ fontSize: 34, lineHeight: 36 }}>
          Barlow Condensed — the shout
        </AppText>
        <AppText v="serif" color={c.inkSoft}>
          Fraunces italic — the coach's voice in the margin.
        </AppText>
        <AppText v="mono" color={c.inkSoft}>
          IBM Plex Mono — every number, tabular, so columns never shiver.
        </AppText>
      </View>
      <P>
        Three voices, three jobs, never swapped: condensed uppercase for structure, serif italic for judgment and
        encouragement, mono for data. If a screen looks wrong, it is almost always because a voice is doing another
        voice's job.
      </P>

      <H>Motion vocabulary</H>
      <KV k="micro (press, toggle)" v={`${motion.fast} ms timing`} />
      <KV k="reveals" v={`${motion.base} ms, ease-out, 60ms stagger`} />
      <KV k="anything that lands" v={`spring d${motion.spring.damping} k${motion.spring.stiffness}`} />
      <KV k="reduced motion" v="everything lands instantly" />
      <P> </P>
      <P>
        One spring for every stamp, pop and landing. The reward moment is the flagship: color flash (a visual haptic),
        radial burst, verdict stamp slamming from 2.4× to rest, delta rows staggering in, coach line last. It got more
        iteration than any screen, because it is the thing a user sees every single session.
      </P>
      <View style={{ alignItems: 'center', marginVertical: space.md }}>
        <Stamp text="Beat" color={c.strength} size="lg" />
      </View>

      <H>The engine</H>
      <P>
        Pure TypeScript, no UI imports, tested with plain node before any screen existed. The rotation is slot-based:
        it advances when a session completes, never with the calendar, so a skipped day just waits. Per slot, per
        session, the rule table is:
      </P>
      <KV k="beat the target" v="+2.5–5% / −1% pace" />
      <KV k="hit the range" v="small bump" />
      <KV k="held partially" v="repeat prescription" />
      <KV k="missed by a margin" v="−5% deload / +3% pace" />
      <P> </P>
      <P>
        Baselines come from three anchor lifts and one honest pace; every other exercise is derived by conventional
        strength ratios and self-corrects within two sessions. PRs are estimated one-rep-max highs (Epley) or best
        pace at distance — a PR requires a previous best, so a first exposure can never be one.
      </P>

      <H>Build pipeline</H>
      <KV k="agent" v="Claude Code (autonomous run)" />
      <KV k="framework" v="Expo SDK 57 · expo-router" />
      <KV k="motion" v="react-native-reanimated 4" />
      <KV k="drawing" v="react-native-svg (icons, charts)" />
      <KV k="design research" v="ui-ux-pro-max skill" />
      <KV k="state" v="one JSON doc → AsyncStorage" />
      <KV k="tests" v="node-run engine invariants" />
      <KV k="deploy" v="expo export --platform web" />
      <P> </P>
      <P>
        Assets are all drawn in code — the icon set, track rings, burst rays and charts are hand-written SVG sharing
        one stroke language — so the whole identity ships in kilobytes and adapts to dark mode for free.
      </P>

      <H>Iteration discipline</H>
      <P>
        No screen shipped after one pass. Each of the five screens got three full critical reviews in a running
        browser: one for layout and spacing faults, one hunting missed opportunities to push the design further, one
        for consistency with the rest of the system — same rules, same voices, same rhythm. The fixes were usually
        small and unglamorous: an orphaned margin, a mono number where a display numeral belonged, a stagger that ran
        60ms too slow.
      </P>

      <H>How to repeat this</H>
      <P>
        1 — Write the comparability engine first, pure and tested; the product is worthless if "vs last time" is
        wrong. 2 — Choose a point of view strong enough to say no with; every generic choice is a missed signature.
        3 — Spend your motion budget on the one animation users see every session. 4 — Make color mean something.
        5 — Review each screen three times with a different question each time. 6 — Ship it live; local files are
        not a portfolio.
      </P>

      <AppText v="label" center color={c.inkFaint} style={{ marginVertical: space.xl, fontSize: 9 }}>
        set in barlow condensed, fraunces & plex mono · printed by claude code
      </AppText>
    </Screen>
  );
}
