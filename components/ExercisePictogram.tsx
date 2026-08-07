"use client";

import { motion } from "framer-motion";
import { MovementPattern } from "@/lib/exerciseCatalog";

// آیکونِ انیمیشنیِ الگوی حرکت — برای هر حرکت، به‌جای عکسِ واقعی (که منبعِ
// قابلِ‌اتکایی براش نداریم)، یه پیکتوگرامِ برداریِ حلقه‌ای می‌سازیم که مسیرِ
// حرکت رو نشون می‌ده (مثلاً پایین‌رفتن/بالاآمدنِ اسکوات، یا چرخشِ آرنج در
// جلوبازو) — طلایی/اکسنت‌رنگ، هم‌راستا با بقیه‌ی اپ.

const LOOP = { duration: 1.6, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const };
const SLOW_LOOP = { ...LOOP, duration: 2.6 };

function Person({ headY = 10, torsoTop = 16, torsoBottom = 34, hipRotate = 0 }: { headY?: number; torsoTop?: number; torsoBottom?: number; hipRotate?: number | number[] }) {
  return (
    <motion.g
      stroke="url(#pictogram-grad)"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
      animate={{ rotate: hipRotate }}
      style={{ transformOrigin: "30px 34px" }}
      transition={LOOP}
    >
      <circle cx="30" cy={headY} r="5" fill="url(#pictogram-grad)" stroke="none" />
      <line x1="30" y1={torsoTop} x2="30" y2={torsoBottom} />
    </motion.g>
  );
}

function Legs({ kneeY = 48, footY = 58, kneeX = 30 }: { kneeY?: number; footY?: number; kneeX?: number }) {
  return (
    <g stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round">
      <line x1="30" y1="34" x2={kneeX - 6} y2={kneeY} />
      <line x1={kneeX - 6} y1={kneeY} x2="26" y2={footY} />
      <line x1="30" y1="34" x2={kneeX + 6} y2={kneeY} />
      <line x1={kneeX + 6} y1={kneeY} x2="34" y2={footY} />
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="pictogram-grad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE68A" />
        <stop offset="100%" stopColor="#F5A623" />
      </linearGradient>
    </defs>
  );
}

function Squat() {
  return (
    <motion.g animate={{ y: [0, 8, 0] }} transition={LOOP}>
      <Person headY={10} torsoTop={16} torsoBottom={32} />
      <motion.g animate={{ scaleY: [1, 0.72, 1] }} style={{ transformOrigin: "30px 34px" }} transition={LOOP}>
        <Legs kneeY={48} footY={58} kneeX={30} />
      </motion.g>
    </motion.g>
  );
}

function Lunge() {
  return (
    <g>
      <Person headY={10} torsoTop={16} torsoBottom={32} />
      <motion.g style={{ transformOrigin: "30px 34px" }} animate={{ rotate: [-4, 8, -4] }} transition={LOOP}>
        <line x1="30" y1="34" x2="20" y2="58" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      <line x1="30" y1="34" x2="40" y2="58" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Hinge() {
  return (
    <g>
      <Person headY={16} torsoTop={20} torsoBottom={34} hipRotate={[0, -28, 0]} />
      <Legs kneeY={48} footY={58} />
    </g>
  );
}

function VerticalPress({ up }: { up: boolean }) {
  return (
    <g>
      <Person headY={22} torsoTop={28} torsoBottom={40} />
      <Legs kneeY={50} footY={58} />
      <motion.g animate={{ y: up ? [12, 0, 12] : [0, 12, 0] }} transition={LOOP}>
        <line x1="18" y1="10" x2="42" y2="10" stroke="url(#pictogram-grad)" strokeWidth="4" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function HorizontalMove({ together }: { together: boolean }) {
  return (
    <g>
      <circle cx="30" cy="34" r="4" fill="url(#pictogram-grad)" />
      <motion.g animate={{ x: together ? [-16, -4, -16] : [-4, -16, -4] }} transition={LOOP}>
        <circle cx="30" cy="34" r="5" fill="url(#pictogram-grad)" />
      </motion.g>
      <motion.g animate={{ x: together ? [16, 4, 16] : [4, 16, 4] }} transition={LOOP}>
        <circle cx="30" cy="34" r="5" fill="url(#pictogram-grad)" />
      </motion.g>
    </g>
  );
}

function PullVertical() {
  return (
    <g>
      <Person headY={22} torsoTop={28} torsoBottom={40} />
      <Legs kneeY={50} footY={58} />
      <motion.g animate={{ y: [0, 12, 0] }} transition={LOOP}>
        <line x1="16" y1="12" x2="44" y2="12" stroke="url(#pictogram-grad)" strokeWidth="4" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function LimbBend({ reverse }: { reverse?: boolean }) {
  const a = reverse ? [8, -55, 8] : [-8, 60, -8];
  return (
    <g>
      <circle cx="30" cy="14" r="5" fill="url(#pictogram-grad)" />
      <line x1="30" y1="19" x2="30" y2="34" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="34" x2="18" y2="52" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
      <motion.line
        x1="18" y1="52" x2="18" y2="34" stroke="url(#pictogram-grad)" strokeWidth="4" strokeLinecap="round"
        style={{ transformOrigin: "18px 52px" }}
        animate={{ rotate: a }}
        transition={LOOP}
      />
    </g>
  );
}

function Raise() {
  return (
    <g>
      <Person headY={10} torsoTop={16} torsoBottom={34} />
      <Legs kneeY={48} footY={58} />
      <motion.line
        x1="30" y1="20" x2="30" y2="34" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round"
        style={{ transformOrigin: "30px 20px" }}
        animate={{ rotate: [80, 0, 80] }}
        transition={LOOP}
      />
    </g>
  );
}

function Core() {
  return (
    <g>
      <line x1="12" y1="40" x2="48" y2="34" stroke="url(#pictogram-grad)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="12" cy="40" r="5" fill="url(#pictogram-grad)" />
      <motion.circle
        cx="48" cy="34" r="6" fill="none" stroke="url(#pictogram-grad)" strokeWidth="2"
        style={{ transformOrigin: "48px 34px" }}
        animate={{ scale: [0.6, 1.8, 0.6], opacity: [0.7, 0, 0.7] }}
        transition={SLOW_LOOP}
      />
    </g>
  );
}

function Calf() {
  return (
    <g>
      <Person headY={10} torsoTop={16} torsoBottom={34} />
      <line x1="30" y1="34" x2="24" y2="48" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="34" x2="36" y2="48" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
      <motion.g animate={{ y: [0, -6, 0] }} transition={LOOP}>
        <line x1="24" y1="48" x2="24" y2="58" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
        <line x1="36" y1="48" x2="36" y2="58" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function Cardio() {
  return (
    <g>
      <Person headY={10} torsoTop={16} torsoBottom={32} />
      <motion.line x1="30" y1="32" x2="18" y2="46" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round"
        style={{ transformOrigin: "30px 32px" }} animate={{ rotate: [20, -20, 20] }} transition={LOOP} />
      <motion.line x1="30" y1="32" x2="42" y2="46" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round"
        style={{ transformOrigin: "30px 32px" }} animate={{ rotate: [-20, 20, -20] }} transition={LOOP} />
    </g>
  );
}

function Explosive() {
  return (
    <motion.g animate={{ y: [0, -12, 0] }} transition={{ ...LOOP, duration: 1.1 }}>
      <Person headY={10} torsoTop={16} torsoBottom={32} />
      <Legs kneeY={44} footY={52} />
    </motion.g>
  );
}

function Flexibility() {
  return (
    <g>
      <Person headY={12} torsoTop={18} torsoBottom={34} />
      <Legs kneeY={48} footY={58} />
      <motion.line
        x1="30" y1="20" x2="30" y2="34" stroke="url(#pictogram-grad)" strokeWidth="3" strokeLinecap="round"
        style={{ transformOrigin: "30px 20px" }}
        animate={{ rotate: [10, -150, 10] }}
        transition={SLOW_LOOP}
      />
    </g>
  );
}

const RENDERERS: Record<MovementPattern, () => React.ReactNode> = {
  squat: Squat,
  lunge: Lunge,
  hinge: Hinge,
  pressHorizontal: () => <VerticalPress up={false} />,
  pressVertical: () => <VerticalPress up />,
  pullHorizontal: () => <HorizontalMove together />,
  pullVertical: PullVertical,
  curl: () => <LimbBend />,
  extension: () => <LimbBend reverse />,
  raise: Raise,
  fly: () => <HorizontalMove together={false} />,
  core: Core,
  calf: Calf,
  cardio: Cardio,
  explosive: Explosive,
  flexibility: Flexibility,
};

export function ExercisePictogram({ pattern, size = 60 }: { pattern: MovementPattern; size?: number }) {
  const Renderer = RENDERERS[pattern] ?? Core;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size}>
      <Defs />
      {Renderer()}
    </svg>
  );
}
