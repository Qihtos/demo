import type { Exercise, ProgressionResult, SetLog } from "./types";

const PROGRESSION_INCREASE_RATE = 0.025;
const DELOAD_RATE = 0.9;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundToIncrement(value: number, incrementKg: number): number {
  if (incrementKg <= 0) return Math.max(0, round1(value));
  return Math.max(0, round1(Math.round(value / incrementKg) * incrementKg));
}

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return round1(weightKg);
  return round1(weightKg * (1 + reps / 30));
}

function bestEstimateFor(sets: SetLog[]): number {
  return sets.reduce((max, set) => {
    const estimate = estimateOneRepMax(set.weightKg, set.reps);
    return estimate > max ? estimate : max;
  }, 0);
}

export function computeNextPrescription(
  exercise: Exercise,
  history: SetLog[],
): ProgressionResult {
  const exerciseHistory = history
    .filter((set) => set.exerciseId === exercise.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (exerciseHistory.length === 0) {
    return {
      targetWeightKg: exercise.startingWeightKg,
      targetReps: exercise.startingReps,
      targetSets: exercise.sets,
      isPersonalRecord: false,
      estimated1RM: estimateOneRepMax(
        exercise.startingWeightKg,
        exercise.startingReps,
      ),
      reason: "first-time",
    };
  }

  const lastSessionId = exerciseHistory[0].sessionId;
  const lastSets = exerciseHistory.filter(
    (set) => set.sessionId === lastSessionId,
  );
  const priorSets = exerciseHistory.filter(
    (set) => set.sessionId !== lastSessionId,
  );

  const lastWeightKg = lastSets[0].weightKg;
  const lastTargetReps = lastSets[0].targetReps;

  const allCompleted = lastSets.every((set) => set.completed);
  const anyCompleted = lastSets.some((set) => set.completed);

  const currentBestEstimate = bestEstimateFor(lastSets);
  const historicalBestEstimate = bestEstimateFor(priorSets);
  const isPersonalRecord =
    priorSets.length > 0 && currentBestEstimate > historicalBestEstimate;

  let targetWeightKg: number;
  let targetReps: number;
  let reason: ProgressionResult["reason"];

  if (allCompleted) {
    if (exercise.equipment === "bodyweight") {
      targetWeightKg = lastWeightKg;
      targetReps = lastTargetReps + 1;
    } else {
      const proposed = roundToIncrement(
        lastWeightKg * (1 + PROGRESSION_INCREASE_RATE),
        exercise.incrementKg,
      );
      targetWeightKg = Math.max(
        proposed,
        roundToIncrement(lastWeightKg + exercise.incrementKg, exercise.incrementKg),
      );
      targetReps = lastTargetReps;
    }
    reason = isPersonalRecord ? "pr" : "progression";
  } else if (!anyCompleted) {
    targetWeightKg =
      exercise.equipment === "bodyweight"
        ? lastWeightKg
        : roundToIncrement(lastWeightKg * DELOAD_RATE, exercise.incrementKg);
    targetReps = lastTargetReps;
    reason = "deload";
  } else {
    targetWeightKg = lastWeightKg;
    targetReps = lastTargetReps;
    reason = isPersonalRecord ? "pr" : "hold";
  }

  return {
    targetWeightKg,
    targetReps,
    targetSets: exercise.sets,
    isPersonalRecord,
    estimated1RM: estimateOneRepMax(targetWeightKg, targetReps),
    reason,
  };
}
