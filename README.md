# Hybrid — a training paper

One app that merges strength training and cardio logging. Every workout unit is
logged against a repeatable **slot**, so each session is directly comparable to
the last time that exact slot came up. A rule-based coach applies progressive
overload from that comparison; the reward loop asks one question: *did you beat
your last self?*

**Live build:** https://samacek123-design.github.io/hybrid/
**Methodology:** the in-app `/guide` route documents the design system, motion
vocabulary, engine rules, and iteration process.

## Product

- **Slot-based rotation** — pick a training frequency (2–5 days/week) and the
  app generates an A/B/C(/D/E) rotation. It advances on completion, not on the
  calendar; skipped days just wait. Cardio holds its own slots.
- **Progressive overload (rule-based)** — beat the target → +2.5–5% (or −1%
  pace); hit the range → small bump; partial → repeat; real miss → deload.
- **PR detection** — Epley estimated 1RM highs and best pace at distance; a PR
  requires a previous best, so a first exposure never counts.
- **3-month block** + weekly target card as macro/micro retention hooks.

## Design

Athletic print zine: warm paper, ink rules, stamp badges, tally marks.
Orange = strength, blue = cardio, gold = record — color is functional first.
Type: Barlow Condensed (structure) / Fraunces italic (the coach's voice) /
IBM Plex Mono (every number). One spring for everything that lands.

## Stack

Expo SDK 57 · expo-router · react-native-reanimated 4 · react-native-svg ·
AsyncStorage (all data stays on-device). Engine is pure TypeScript.

## Develop

```sh
npm install
npx expo start --web            # dev server
node src/lib/engine.test.ts     # engine invariant tests (plain node)
npx expo export --platform web  # static build → dist/
node scripts/shoot.mjs out/     # headless screenshot walk of every screen
```

Deployed by pushing `dist/` (plus `.nojekyll`) to the `gh-pages` branch.
