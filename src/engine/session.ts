import { computeNextPrescription } from "./math";
import type {
  Exercise,
  ExerciseCategory,
  PrescribedExercise,
  ProgressionResult,
  SetLog,
  WorkoutSession,
} from "./types";

const PROGRAM_CYCLE: ExerciseCategory[] = ["push", "pull", "legs"];
const REST_SECONDS_COMPOUND = 120;
const REST_SECONDS_ISOLATION = 75;

export function getDayType(cycleIndex: number): ExerciseCategory {
  const index = ((cycleIndex % PROGRAM_CYCLE.length) + PROGRAM_CYCLE.length) %
    PROGRAM_CYCLE.length;
  return PROGRAM_CYCLE[index];
}

export function orderExercisesForDay(
  exercises: Exercise[],
  dayType: ExerciseCategory,
): Exercise[] {
  return exercises
    .filter((exercise) => exercise.category === dayType)
    .sort((a, b) => {
      if (a.isCompound !== b.isCompound) return a.isCompound ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function noteFor(result: ProgressionResult): string {
  switch (result.reason) {
    case "first-time":
      return "First time — starting weight";
    case "pr":
      return "New personal record pace — pushing further";
    case "progression":
      return "Nailed it last time — adding weight";
    case "deload":
      return "Missed reps — lightening the load";
    case "hold":
      return "So close — same weight, lock it in";
  }
}

export function buildTodaysSession(
  exercises: Exercise[],
  history: SetLog[],
  cycleIndex: number,
  sessionId: string,
  date: string,
): WorkoutSession {
  const dayType = getDayType(cycleIndex);
  const ordered = orderExercisesForDay(exercises, dayType);

  const prescribed: PrescribedExercise[] = ordered.map((exercise) => {
    const result = computeNextPrescription(exercise, history);
    return {
      exerciseId: exercise.id,
      name: exercise.name,
      targetWeightKg: result.targetWeightKg,
      targetReps: result.targetReps,
      targetSets: result.targetSets,
      restSeconds: exercise.isCompound
        ? REST_SECONDS_COMPOUND
        : REST_SECONDS_ISOLATION,
      isPersonalRecord: result.isPersonalRecord,
      note: noteFor(result),
    };
  });

  return {
    id: sessionId,
    date,
    dayType,
    exercises: prescribed,
    cursor: 0,
  };
}
