import type { SetLog, WorkoutSession } from "../engine/types";

const HISTORY_KEY = "fit-coach:v1:history";
const SESSION_KEY = "fit-coach:v1:active-session";
const CYCLE_KEY = "fit-coach:v1:cycle-index";
const SCHEMA_VERSION = 1;

interface VersionedPayload<T> {
  version: number;
  data: T;
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readRaw<T>(key: string): T | null {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VersionedPayload<T>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      parsed.version !== SCHEMA_VERSION ||
      !("data" in parsed)
    ) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeRaw<T>(key: string, data: T): void {
  if (!hasLocalStorage()) return;
  try {
    const payload: VersionedPayload<T> = { version: SCHEMA_VERSION, data };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage unavailable or quota exceeded: fail silently, in-memory state remains authoritative for this session.
  }
}

function isValidSetLog(value: unknown): value is SetLog {
  if (typeof value !== "object" || value === null) return false;
  const set = value as Record<string, unknown>;
  return (
    typeof set.id === "string" &&
    typeof set.sessionId === "string" &&
    typeof set.exerciseId === "string" &&
    typeof set.weightKg === "number" &&
    Number.isFinite(set.weightKg) &&
    typeof set.reps === "number" &&
    Number.isFinite(set.reps) &&
    typeof set.targetReps === "number" &&
    Number.isFinite(set.targetReps) &&
    typeof set.timestamp === "number" &&
    Number.isFinite(set.timestamp) &&
    typeof set.completed === "boolean"
  );
}

export function loadHistory(): SetLog[] {
  const data = readRaw<SetLog[]>(HISTORY_KEY);
  if (!Array.isArray(data)) return [];
  return data.filter(isValidSetLog);
}

export function saveHistory(history: SetLog[]): void {
  writeRaw(HISTORY_KEY, history);
}

export function appendSetLog(setLog: SetLog): SetLog[] {
  const history = loadHistory();
  const updated = [...history, setLog];
  saveHistory(updated);
  return updated;
}

export function clearHistory(): void {
  saveHistory([]);
}

function isValidSession(value: unknown): value is WorkoutSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === "string" &&
    typeof session.date === "string" &&
    typeof session.dayType === "string" &&
    Array.isArray(session.exercises) &&
    typeof session.cursor === "number"
  );
}

export function loadActiveSession(): WorkoutSession | null {
  const data = readRaw<WorkoutSession>(SESSION_KEY);
  if (!data || !isValidSession(data)) return null;
  return data;
}

export function saveActiveSession(session: WorkoutSession): void {
  writeRaw(SESSION_KEY, session);
}

export function clearActiveSession(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function loadCycleIndex(): number {
  const data = readRaw<number>(CYCLE_KEY);
  return typeof data === "number" && Number.isFinite(data) ? data : 0;
}

export function saveCycleIndex(cycleIndex: number): void {
  writeRaw(CYCLE_KEY, cycleIndex);
}
