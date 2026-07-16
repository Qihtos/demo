import { beforeEach, describe, expect, it } from "vitest";
import {
  appendSetLog,
  clearActiveSession,
  clearHistory,
  loadActiveSession,
  loadCycleIndex,
  loadHistory,
  saveActiveSession,
  saveCycleIndex,
  saveHistory,
} from "../../lib/storage";
import type { SetLog, WorkoutSession } from "../types";

const sampleSet: SetLog = {
  id: "set-1",
  sessionId: "session-1",
  exerciseId: "bench-press",
  weightKg: 40,
  reps: 8,
  targetReps: 8,
  timestamp: 12345,
  completed: true,
};

const sampleSession: WorkoutSession = {
  id: "session-1",
  date: "2026-07-16",
  dayType: "push",
  exercises: [],
  cursor: 0,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("history storage", () => {
  it("round-trips a saved history exactly", () => {
    saveHistory([sampleSet]);
    expect(loadHistory()).toEqual([sampleSet]);
  });

  it("appends a set log and persists it", () => {
    const updated = appendSetLog(sampleSet);
    expect(updated).toEqual([sampleSet]);
    expect(loadHistory()).toEqual([sampleSet]);
  });

  it("returns an empty array when no history has been saved", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("falls back to an empty array when stored JSON is corrupt", () => {
    window.localStorage.setItem("fit-coach:v1:history", "{not valid json");
    expect(loadHistory()).toEqual([]);
  });

  it("falls back to an empty array when the stored schema version is unknown", () => {
    window.localStorage.setItem(
      "fit-coach:v1:history",
      JSON.stringify({ version: 999, data: [sampleSet] }),
    );
    expect(loadHistory()).toEqual([]);
  });

  it("filters out malformed entries while keeping valid ones", () => {
    window.localStorage.setItem(
      "fit-coach:v1:history",
      JSON.stringify({
        version: 1,
        data: [sampleSet, { id: "broken" }, null, 42],
      }),
    );
    expect(loadHistory()).toEqual([sampleSet]);
  });

  it("clears all stored history", () => {
    saveHistory([sampleSet]);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});

describe("active session storage", () => {
  it("round-trips the active session", () => {
    saveActiveSession(sampleSession);
    expect(loadActiveSession()).toEqual(sampleSession);
  });

  it("returns null when no session is active", () => {
    expect(loadActiveSession()).toBeNull();
  });

  it("returns null for corrupt session data instead of throwing", () => {
    window.localStorage.setItem("fit-coach:v1:active-session", "not json {{{");
    expect(() => loadActiveSession()).not.toThrow();
    expect(loadActiveSession()).toBeNull();
  });

  it("clears the active session", () => {
    saveActiveSession(sampleSession);
    clearActiveSession();
    expect(loadActiveSession()).toBeNull();
  });
});

describe("cycle index storage", () => {
  it("round-trips the cycle index", () => {
    saveCycleIndex(2);
    expect(loadCycleIndex()).toBe(2);
  });

  it("defaults to 0 when nothing is stored", () => {
    expect(loadCycleIndex()).toBe(0);
  });

  it("defaults to 0 when the stored value is corrupt", () => {
    window.localStorage.setItem("fit-coach:v1:cycle-index", "{{{");
    expect(loadCycleIndex()).toBe(0);
  });
});
