/**
 * Skeleton.jsx — Shimmer loading skeletons for CrimeCast
 * Usage:
 *   <Skeleton.Card />          ← stat card placeholder
 *   <Skeleton.Row />           ← table row placeholder
 *   <Skeleton.Text lines={3} /> ← text block
 *   <Skeleton.Circle size={40} />
 *   <Skeleton.Block h={120} />
 */
import React from 'react';

const base = {
  background: 'linear-gradient(90deg, rgba(39,39,42,0.6) 25%, rgba(63,63,70,0.5) 50%, rgba(39,39,42,0.6) 75%)',
  backgroundSize: '200% 100%',
  animation: 'cc-shimmer 1.6s ease-in-out infinite',
  borderRadius: '8px',
};

/* ── Primitive ─────────────────────────────────────────────────────── */
const Block = ({ w = '100%', h = 16, r = 8, className = '', style = {} }) => (
  <div className={className} style={{ ...base, width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
);

const Circle = ({ size = 40, className = '' }) => (
  <div className={className} style={{ ...base, width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
);

/* ── Stat Card ─────────────────────────────────────────────────────── */
const Card = () => (
  <div
    className="p-5 rounded-2xl border border-zinc-800/50 space-y-3"
    style={{ background: 'rgba(0,0,0,0.6)' }}
  >
    <div className="flex items-center justify-between">
      <Circle size={36} />
      <Block w={40} h={12} />
    </div>
    <Block w="55%" h={10} />
    <Block w="100%" h={28} r={6} />
    <Block w="40%" h={10} />
  </div>
);

/* ── Table Row ─────────────────────────────────────────────────────── */
const Row = ({ cols = 5 }) => (
  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
    {Array.from({ length: cols }, (_, i) => (
      <td key={i} className="px-4 py-3">
        <Block w={i === 0 ? 60 : i === cols - 1 ? 50 : '80%'} h={10} />
      </td>
    ))}
  </tr>
);

/* ── Text block ────────────────────────────────────────────────────── */
const Text = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <Block key={i} w={i === lines - 1 ? '60%' : '100%'} h={12} />
    ))}
  </div>
);

/* ── Full-width block ──────────────────────────────────────────────── */
const FullBlock = ({ h = 120, className = '' }) => (
  <Block w="100%" h={h} r={16} className={className} />
);

/* ── Alert Card ────────────────────────────────────────────────────── */
const AlertCard = () => (
  <div
    className="p-4 rounded-2xl border border-zinc-800/50 space-y-3"
    style={{ background: 'rgba(0,0,0,0.6)' }}
  >
    <div className="flex items-start gap-3">
      <Circle size={44} />
      <div className="flex-1 space-y-2">
        <Block w="70%" h={12} />
        <Block w="45%" h={10} />
      </div>
      <Block w={56} h={22} r={20} />
    </div>
    <div className="flex gap-2">
      <Block w="33%" h={30} r={8} />
      <Block w="33%" h={30} r={8} />
      <Block w="33%" h={30} r={8} />
    </div>
  </div>
);

const SkeletonComponent = (props) => <Block {...props} />;
SkeletonComponent.Block = Block;
SkeletonComponent.Circle = Circle;
SkeletonComponent.Card = Card;
SkeletonComponent.Row = Row;
SkeletonComponent.Text = Text;
SkeletonComponent.FullBlock = FullBlock;
SkeletonComponent.AlertCard = AlertCard;

export const Skeleton = SkeletonComponent;
export default SkeletonComponent;

