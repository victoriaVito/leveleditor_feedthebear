import { describe, expect, test } from "vitest";
import { generateLevel, generateProgression } from "../src/index.js";

describe("feed-the-bear generator scaffold", () => {
  test("Level 1 has high solution density", () => {
    expect(generateLevel(1).solution_count).toBeGreaterThanOrEqual(3);
  });

  test("Level 9 has exactly one solution", () => {
    expect(generateLevel(9).solution_count).toBe(1);
  });

  test("Level 10 is not harder than Level 9", () => {
    const l9 = generateLevel(9);
    const l10 = generateLevel(10);
    expect(l10.solution_count).toBeGreaterThanOrEqual(2);
    expect(l10.solution_count).toBeLessThanOrEqual(4);
    expect(l10.solution_count).toBeGreaterThan(l9.solution_count);
  });

  test("Full progression is monotonically harder through Level 9", () => {
    const levels = generateProgression();
    for (let i = 1; i < 9; i++) {
      expect(levels[i]!.solution_count).toBeLessThanOrEqual(levels[i - 1]!.solution_count);
    }
  });

  test("No level is unsolvable", () => {
    generateProgression().forEach((l) => expect(l.validation.solvable).toBe(true));
  });
});
