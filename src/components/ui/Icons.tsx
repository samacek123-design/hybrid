/**
 * Hand-drawn icon set — one visual language: 24×24 viewBox, 2px stroke,
 * square caps, no fills except deliberate stamps. Domain icons echo the
 * print-zine identity (barbell plates, running track oval).
 */
import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

const base = (p: IconProps) => ({
  width: p.size ?? 24,
  height: p.size ?? 24,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
});
const stroke = (p: IconProps) => ({
  stroke: p.color,
  strokeWidth: p.strokeWidth ?? 2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
});

/** barbell — strength domain */
export function IconBarbell(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Line x1="7" y1="12" x2="17" y2="12" {...stroke(p)} />
      <Rect x="4" y="7" width="3" height="10" {...stroke(p)} />
      <Rect x="17" y="7" width="3" height="10" {...stroke(p)} />
      <Line x1="1.5" y1="9.5" x2="1.5" y2="14.5" {...stroke(p)} />
      <Line x1="22.5" y1="9.5" x2="22.5" y2="14.5" {...stroke(p)} />
    </Svg>
  );
}

/** track oval — cardio domain */
export function IconTrack(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Ellipse cx="12" cy="12" rx="10" ry="6.5" {...stroke(p)} />
      <Ellipse cx="12" cy="12" rx="5.5" ry="2.8" {...stroke(p)} />
      <Line x1="12" y1="5.5" x2="12" y2="9.2" {...stroke(p)} />
    </Svg>
  );
}

/** today — the day's card, folded corner */
export function IconCard(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Path d="M4 3h16v18H4z" {...stroke(p)} />
      <Line x1="8" y1="8" x2="16" y2="8" {...stroke(p)} />
      <Line x1="8" y1="12" x2="16" y2="12" {...stroke(p)} />
      <Line x1="8" y1="16" x2="12" y2="16" {...stroke(p)} />
    </Svg>
  );
}

/** history — the ledger */
export function IconLedger(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Circle cx="12" cy="12" r="9" {...stroke(p)} />
      <Polyline points="12,7 12,12 15.5,14" {...stroke(p)} />
    </Svg>
  );
}

/** progress — trend with a PR tick */
export function IconTrend(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Polyline points="3,18 9,12 13,15 21,6" {...stroke(p)} />
      <Line x1="21" y1="6" x2="21" y2="10" {...stroke(p)} />
      <Line x1="17" y1="6" x2="21" y2="6" {...stroke(p)} />
    </Svg>
  );
}

/** profile — race bib */
export function IconBib(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Path d="M5 4h14v16H5z" {...stroke(p)} />
      <Line x1="5" y1="9" x2="19" y2="9" {...stroke(p)} />
      <Line x1="9" y1="13.5" x2="15" y2="13.5" {...stroke(p)} />
      <Line x1="9" y1="16.5" x2="15" y2="16.5" {...stroke(p)} />
      <Circle cx="7.5" cy="6.5" r="0.8" fill={p.color} stroke="none" />
      <Circle cx="16.5" cy="6.5" r="0.8" fill={p.color} stroke="none" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Polyline points="4,13 9.5,18.5 20,6" {...stroke(p)} />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Line x1="12" y1="5" x2="12" y2="19" {...stroke(p)} />
      <Line x1="5" y1="12" x2="19" y2="12" {...stroke(p)} />
    </Svg>
  );
}

export function IconMinus(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Line x1="5" y1="12" x2="19" y2="12" {...stroke(p)} />
    </Svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Line x1="3" y1="12" x2="20" y2="12" {...stroke(p)} />
      <Polyline points="14,6 20,12 14,18" {...stroke(p)} />
    </Svg>
  );
}

export function IconArrowLeft(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Line x1="21" y1="12" x2="4" y2="12" {...stroke(p)} />
      <Polyline points="10,6 4,12 10,18" {...stroke(p)} />
    </Svg>
  );
}

/** guide — folded methodology paper */
export function IconPaper(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Path d="M6 3h9l4 4v14H6z" {...stroke(p)} />
      <Polyline points="15,3 15,7 19,7" {...stroke(p)} />
      <Line x1="9" y1="12" x2="16" y2="12" {...stroke(p)} />
      <Line x1="9" y1="16" x2="14" y2="16" {...stroke(p)} />
    </Svg>
  );
}

export function IconTimer(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Circle cx="12" cy="13" r="8" {...stroke(p)} />
      <Line x1="12" y1="13" x2="12" y2="8.5" {...stroke(p)} />
      <Line x1="9.5" y1="2.5" x2="14.5" y2="2.5" {...stroke(p)} />
    </Svg>
  );
}
