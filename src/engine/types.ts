export type ExerciseCategory = "push" | "pull" | "legs";

export type EquipmentType = "barbell" | "dumbbell" | "machine" | "bodyweight";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: EquipmentType;
  isCompound: boolean;
  incrementKg: number;
  startingWeightKg: number;
  startingReps: number;
  sets: number;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  targetReps: number;
  timestamp: number;
  completed: boolean;
}

export type PrescriptionReason =
  | "first-time"
  | "progression"
  | "deload"
  | "hold"
  | "pr";

export interface ProgressionResult {
  targetWeightKg: number;
  targetReps: number;
  targetSets: number;
  isPersonalRecord: boolean;
  estimated1RM: number;
  reason: PrescriptionReason;
}

export interface PrescribedExercise {
  exerciseId: string;
  name: string;
  targetWeightKg: number;
  targetReps: number;
  targetSets: number;
  restSeconds: number;
  isPersonalRecord: boolean;
  note: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  dayType: ExerciseCategory;
  exercises: PrescribedExercise[];
  cursor: number;
}

export interface ProgressionState {
  exerciseId: string;
  lastWeightKg: number;
  lastReps: number;
  estimated1RM: number;
  personalRecordKg: number;
  updatedAt: number;
}
