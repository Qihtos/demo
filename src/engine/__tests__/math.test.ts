import { describe, expect, it } from "vitest";
import { computeNextPrescription, estimateOneRepMax, roundToIncrement } from "../math";
import type { Exercise, SetLog } from "../types";

const benchPress: Exercise = {
  id: "bench-press",
  name: "Barbell Bench Press",
  category: "push",
  equipment: "barbell",
  isCompound: true,
  incrementKg: 2.5,
  startingWeightKg: 20,
  startingReps: 8,
  sets: 3,
};

const pullUp: Exercise = {
  id: "pull-up",
  name: "Pull-Up",
  category: "pull",
  equipment: "bodyweight",
  isCompound: true,
  incrementKg: 0,
  startingWeightKg: 0,
  startingReps: 5,
  sets: 3,
};

function makeSet(overrides: Partial<SetLog>): SetLog {
  return {
    id: `set-${Math.random()}`,
    sessionId: "session-1",
    exerciseId: benchPress.id,
    weightKg: 20,
    reps: 8,
    targetReps: 8,
    timestamp: Date.now(),
    completed: true,
    ...overrides,
  };
}

describe("estimateOneRepMax", () => {
  it("returns the exact weight for a single rep", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("applies the Epley formula for multiple reps", () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(100 * (1 + 5 / 30), 1);
  });

  it("returns 0 for non-positive weight or reps", () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(-10, 5)).toBe(0);
  });
});

describe("roundToIncrement", () => {
  it("rounds to the nearest increment", () => {
    expect(roundToIncrement(21.3, 2.5)).toBe(22.5);
    expect(roundToIncrement(20.1, 2.5)).toBe(20);
  });

  it("falls back to one-decimal rounding when increment is 0", () => {
    expect(roundToIncrement(12.34, 0)).toBe(12.3);
  });

  it("never returns a negative value", () => {
    expect(roundToIncrement(-5, 2.5)).toBe(0);
  });
});

describe("computeNextPrescription: first-time exercise", () => {
  it("prescribes the exercise's starting weight and reps with no history", () => {
    const result = computeNextPrescription(benchPress, []);
    expect(result.reason).toBe("first-time");
    expect(result.targetWeightKg).toBe(20);
    expect(result.targetReps).toBe(8);
    expect(result.targetSets).toBe(3);
    expect(result.isPersonalRecord).toBe(false);
  });

  it("ignores history belonging to a different exercise", () => {
    const history = [makeSet({ exerciseId: "back-squat", weightKg: 60, reps: 5 })];
    const result = computeNextPrescription(benchPress, history);
    expect(result.reason).toBe("first-time");
    expect(result.targetWeightKg).toBe(benchPress.startingWeightKg);
  });
});

describe("computeNextPrescription: successful set progression", () => {
  it("increases weight when all sets in the last session hit the target reps", () => {
    const history: SetLog[] = [
      makeSet({ weightKg: 40, reps: 8, targetReps: 8, completed: true }),
      makeSet({ weightKg: 40, reps: 9, targetReps: 8, completed: true }),
      makeSet({ weightKg: 40, reps: 8, targetReps: 8, completed: true }),
    ];
    const result = computeNextPrescription(benchPress, history);
    expect(result.reason).toBe("progression");
    expect(result.targetWeightKg).toBeGreaterThan(40);
    expect(result.targetWeightKg).toBe(42.5);
    expect(result.targetReps).toBe(8);
  });

  it("progresses bodyweight exercises by adding a rep instead of weight", () => {
    const history: SetLog[] = [
      makeSet({ exerciseId: pullUp.id, weightKg: 0, reps: 5, targetReps: 5, completed: true }),
      makeSet({ exerciseId: pullUp.id, weightKg: 0, reps: 5, targetReps: 5, completed: true }),
    ];
    const result = computeNextPrescription(pullUp, history);
    expect(result.reason).toBe("progression");
    expect(result.targetWeightKg).toBe(0);
    expect(result.targetReps).toBe(6);
  });
});

describe("computeNextPrescription: missed set deload", () => {
  it("reduces weight by roughly 10% when every set in the last session was missed", () => {
    const history: SetLog[] = [
      makeSet({ weightKg: 50, reps: 4, targetReps: 8, completed: false }),
      makeSet({ weightKg: 50, reps: 3, targetReps: 8, completed: false }),
      makeSet({ weightKg: 50, reps: 3, targetReps: 8, completed: false }),
    ];
    const result = computeNextPrescription(benchPress, history);
    expect(result.reason).toBe("deload");
    expect(result.targetWeightKg).toBeLessThan(50);
    expect(result.targetWeightKg).toBe(45);
  });

  it("holds the same weight and reps when the session was only partially completed", () => {
    const history: SetLog[] = [
      makeSet({ weightKg: 50, reps: 8, targetReps: 8, completed: true }),
      makeSet({ weightKg: 50, reps: 5, targetReps: 8, completed: false }),
    ];
    const result = computeNextPrescription(benchPress, history);
    expect(result.reason).toBe("hold");
    expect(result.targetWeightKg).toBe(50);
    expect(result.targetReps).toBe(8);
  });
});

describe("computeNextPrescription: personal record detection", () => {
  it("flags a personal record when the latest session beats every prior estimated 1RM", () => {
    const history: SetLog[] = [
      makeSet({ sessionId: "session-1", weightKg: 40, reps: 8, targetReps: 8, completed: true, timestamp: 1 }),
      makeSet({ sessionId: "session-2", weightKg: 42.5, reps: 8, targetReps: 8, completed: true, timestamp: 2 }),
    ];
    const result = computeNextPrescription(benchPress, history);
    expect(result.reason).toBe("pr");
    expect(result.isPersonalRecord).toBe(true);
  });

  it("does not flag a personal record when the latest session is weaker than prior history", () => {
    const history: SetLog[] = [
      makeSet({ sessionId: "session-1", weightKg: 60, reps: 8, targetReps: 8, completed: true, timestamp: 1 }),
      makeSet({ sessionId: "session-2", weightKg: 40, reps: 8, targetReps: 8, completed: true, timestamp: 2 }),
    ];
    const result = computeNextPrescription(benchPress, history);
    expect(result.isPersonalRecord).toBe(false);
    expect(result.reason).toBe("progression");
  });
});
