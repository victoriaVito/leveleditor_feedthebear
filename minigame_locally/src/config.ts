import type { CurveRow, DensityLabel } from "./types.js";

export const DIFFICULTY_CURVE: CurveRow[] = [
  { level: 1, target_density: "HIGH", boardOptions: [4], pairRange: [2, 2], blockerRange: [0, 0] },
  { level: 2, target_density: "HIGH", boardOptions: [4], pairRange: [2, 2], blockerRange: [0, 1] },
  { level: 3, target_density: "MEDIUM-HIGH", boardOptions: [4], pairRange: [2, 3], blockerRange: [1, 1] },
  { level: 4, target_density: "MEDIUM", boardOptions: [4], pairRange: [3, 3], blockerRange: [1, 2] },
  { level: 5, target_density: "MEDIUM", boardOptions: [5], pairRange: [3, 3], blockerRange: [1, 2] },
  { level: 6, target_density: "MEDIUM-LOW", boardOptions: [5], pairRange: [3, 4], blockerRange: [2, 3] },
  { level: 7, target_density: "LOW", boardOptions: [5], pairRange: [3, 4], blockerRange: [3, 4] },
  { level: 8, target_density: "VERY-LOW", boardOptions: [5], pairRange: [4, 4], blockerRange: [3, 5] },
  { level: 9, target_density: "SINGLE", boardOptions: [5], pairRange: [4, 4], blockerRange: [4, 5] },
  { level: 10, target_density: "LOW-MEDIUM", boardOptions: [5, 6], pairRange: [3, 4], blockerRange: [2, 3] }
];

export const DENSITY_RANGES: Record<DensityLabel, [number, number]> = {
  HIGH: [6, 20],
  "MEDIUM-HIGH": [3, 5],
  MEDIUM: [2, 4],
  "MEDIUM-LOW": [2, 3],
  LOW: [2, 2],
  "VERY-LOW": [2, 2],
  SINGLE: [1, 1],
  "LOW-MEDIUM": [2, 3]
};

export const LEVEL_TARGET_COUNTS: Record<number, number> = {
  1: 6,
  2: 6,
  3: 5,
  4: 4,
  5: 4,
  6: 3,
  7: 2,
  8: 2,
  9: 1,
  10: 3
};

export const PALETTE = [
  "#0EA5E9",
  "#0284C7",
  "#0891B2",
  "#0369A1",
  "#38BDF8",
  "#16A34A"
] as const;
