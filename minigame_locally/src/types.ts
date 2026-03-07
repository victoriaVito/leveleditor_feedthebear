export type CellState = "EMPTY" | "BLOCKED" | "OCCUPIED";
export type GridCell = CellState | `NODE_${string}`;

export type DensityLabel =
  | "HIGH"
  | "MEDIUM-HIGH"
  | "MEDIUM"
  | "MEDIUM-LOW"
  | "LOW"
  | "VERY-LOW"
  | "SINGLE"
  | "LOW-MEDIUM";

export interface Pair {
  id: string;
  start: [number, number];
  end: [number, number];
  color: string;
}

export interface ValidationResult {
  solvable: boolean;
  density_match: boolean;
  early_mistake_detection: boolean;
  no_isolated_pairs: boolean;
  no_late_dead_ends: boolean;
  curve_integrity: boolean;
}

export interface LevelOutput {
  level: number;
  board_size: number;
  grid: GridCell[][];
  pairs: Pair[];
  blockers: [number, number][];
  solution_count: number;
  target_density: DensityLabel;
  golden_path: Record<string, [number, number][]>;
  validation: ValidationResult;
  meta: {
    generation_attempts: number;
    failed_checks: string[];
  };
}

export interface CurveRow {
  level: number;
  target_density: DensityLabel;
  boardOptions: number[];
  pairRange: [number, number];
  blockerRange: [number, number];
}
