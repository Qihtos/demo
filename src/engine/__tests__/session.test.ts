import { describe, expect, it } from "vitest";
import { buildTodaysSession, getDayType, orderExercisesForDay } from "../session";
import { DEFAULT_EXERCISES } from "../exercises";
import type { SetLog } from "../types";

describe("getDayType", () => {
  it("cycles through push, pull, legs", () => {
    expect(getDayType(0)).toBe("push");
    expect(getDayType(1)).toBe("pull");
    expect(getDayType(2)).toBe("legs");
    expect(getDayType(3)).toBe("push");
  });

  it("wraps negative cycle indices safely", () => {
    expect(getDayType(-1)).toBe("legs");
  });
});

describe("orderExercisesForDay", () => {
  it("orders compound movements before isolation movements", () => {
    const ordered = orderExercisesForDay(DEFAULT_EXERCISES, "push");
    expect(ordered.length).toBeGreaterThan(0);
    expect(ordered.every((exercise) => exercise.category === "push")).toBe(true);
    const firstIsolationIndex = ordered.findIndex((exercise) => !exercise.isCompound);
    const lastCompoundIndex = ordered.map((e) => e.isCompound).lastIndexOf(true);
    expect(firstIsolationIndex).toBeGreaterThan(lastCompoundIndex);
  });
});

describe("buildTodaysSession", () => {
  it("produces a fully prescribed session with no history", () => {
    const session = buildTodaysSession(DEFAULT_EXERCISES, [], 0, "s1", "2026-07-16");
    expect(session.dayType).toBe("push");
    expect(session.exercises.length).toBeGreaterThan(0);
    for (const exercise of session.exercises) {
      expect(exercise.targetWeightKg).toBeGreaterThanOrEqual(0);
      expect(exercise.targetReps).toBeGreaterThan(0);
      expect(exercise.note.length).toBeGreaterThan(0);
    }
  });

  it("reflects prior progression in the prescribed exercises", () => {
    const history: SetLog[] = [
      {
        id: "set-1",
        sessionId: "prev-session",
        exerciseId: "bench-press",
        weightKg: 40,
        reps: 8,
        targetReps: 8,
        timestamp: 1,
        completed: true,
      },
    ];
    const session = buildTodaysSession(DEFAULT_EXERCISES, history, 0, "s2", "2026-07-17");
    const bench = session.exercises.find((e) => e.exerciseId === "bench-press");
    expect(bench).toBeDefined();
    expect(bench!.targetWeightKg).toBeGreaterThan(40);
  });
});
