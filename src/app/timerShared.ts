// We store whatever's *not* frequently changing in state.
// If the timer's paused, that's the amount of time left; if the timer's
// running, it's the timer's end time.
export type TimerState =
  | { type: "paused"; totalTimeMs: number; timeLeftMs: number }
  | { type: "running"; totalTimeMs: number; endTimeMs: number };

export const MINUTE_MS = 60 * 1000;
