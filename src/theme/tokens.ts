/**
 * HYBRID design tokens — "athletic print zine".
 *
 * Point of view: a vintage track-and-field program printed on warm paper.
 * Ink black on paper, one hot signal color per training domain:
 *   strength = signal orange, cardio = track blue.
 * Hard 2px rules, zero radius on structural elements, stamp-like badges.
 * Condensed uppercase display type, serif italics for editorial moments,
 * tabular mono for every number.
 */
import { Appearance } from 'react-native';

export const palette = {
  paper: '#F4EFE4',
  paperRaised: '#FBF8F1',
  paperSunken: '#EAE3D2',
  ink: '#16130D',
  // darkened from the original #5C564A / #8A8375 — those measured ~6.3:1 /
  // ~3.3:1 against `paper`; the latter fails WCAG AA for the small mono
  // labels it's used on throughout the app (focus lines, meta rows).
  inkSoft: '#403A2E',
  inkFaint: '#6A6353',
  line: '#16130D',
  lineFaint: '#D8D0BD',
  strength: '#E8490F', // signal orange
  strengthDeep: '#B33409',
  cardio: '#1D53C4', // track blue
  cardioDeep: '#143C8F',
  gold: '#C9950C', // PR / record moments
  success: '#2E6B33',
  danger: '#A82814',
} as const;

/** dark variant: night-print — same ink logic inverted onto near-black felt */
export const paletteDark = {
  paper: '#171512',
  paperRaised: '#211E19',
  paperSunken: '#100E0C',
  ink: '#F0EADB',
  inkSoft: '#A79F8E',
  // lightened from #6E6759 (~3.25:1 against dark paper) for the same reason.
  inkFaint: '#948C7A',
  line: '#F0EADB',
  lineFaint: '#3A362E',
  strength: '#FF5C1F',
  strengthDeep: '#FF7C48',
  cardio: '#5B8DFF',
  cardioDeep: '#82A8FF',
  gold: '#E5B33C',
  success: '#69A86E',
  danger: '#E05B44',
} as const;

export type Palette = typeof palette;

export function currentPalette(scheme?: 'light' | 'dark' | null): Palette {
  const s = scheme ?? Appearance.getColorScheme();
  return s === 'dark' ? (paletteDark as unknown as Palette) : palette;
}

export const fonts = {
  /** oversized condensed display — Barlow Condensed 700 */
  display: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_500Medium',
  displayRegular: 'BarlowCondensed_400Regular',
  /** editorial serif italic — Fraunces */
  serifItalic: 'Fraunces_400Regular_Italic',
  serifBoldItalic: 'Fraunces_600SemiBold_Italic',
  /** numbers + labels — IBM Plex Mono */
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  hero: 72,
} as const;

/** shared motion vocabulary — one rhythm across all screens */
export const motion = {
  /** micro-interactions (press, toggle) */
  fast: 140,
  /** standard reveals */
  base: 260,
  /** screen-level choreography */
  slow: 420,
  /** spring used for anything that lands, stamps or pops */
  spring: { damping: 14, stiffness: 180, mass: 0.9 },
  springSoft: { damping: 18, stiffness: 120, mass: 1 },
} as const;

export const layout = {
  maxWidth: 560, // phone-first canvas, centered on desktop
  gutter: 20,
  hairline: 1,
  rule: 2, // signature hard border
} as const;
