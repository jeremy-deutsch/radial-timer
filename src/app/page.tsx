"use client";

import { motion, useTime, useTransform } from "framer-motion";
import styles from "./page.module.css";
import { useState } from "react";

// We store whatever's *not* frequently changing in state.
// If the timer's paused, that's the amount of time left; if the timer's
// running, it's the timer's end time.
type TimerState =
  | { type: "paused"; totalTimeMs: number; timeLeftMs: number }
  | { type: "running"; totalTimeMs: number; endTimeMs: number };

const MINUTE_MS = 60 * 1000;

const INITIAL_TIMER_STATE: TimerState = {
  type: "paused",
  totalTimeMs: 0,
  timeLeftMs: 0,
};

export default function Home() {
  const currentTime = useTime();

  const [timerState, setTimerState] = useState<TimerState>(INITIAL_TIMER_STATE);

  const animatedTimeLeftMs = useTransform(() => {
    if (timerState.type === "paused") {
      return timerState.timeLeftMs;
    } else {
      return timerState.endTimeMs - currentTime.get();
    }
  });

  const animatedTimeLeftText = useTransform(() => {
    const ms = animatedTimeLeftMs.get();
    const minutes = Math.floor(ms / MINUTE_MS);
    const seconds = Math.floor((ms % MINUTE_MS) / 1000);
    return `${padLeadingZero(minutes)}:${padLeadingZero(seconds)}`;
  });

  function addOneMinute() {
    setTimerState((state) => {
      if (state.type === "paused") {
        return {
          type: "paused",
          totalTimeMs: state.totalTimeMs + MINUTE_MS,
          timeLeftMs: state.timeLeftMs + MINUTE_MS,
        };
      } else {
        return {
          type: "running",
          totalTimeMs: state.totalTimeMs + MINUTE_MS,
          endTimeMs: state.endTimeMs + MINUTE_MS,
        };
      }
    });
  }

  function reset() {
    setTimerState(INITIAL_TIMER_STATE);
  }

  function togglePaused() {
    const now = currentTime.get();
    setTimerState((state) => {
      if (state.type === "paused") {
        const { totalTimeMs, timeLeftMs } = state;
        if (totalTimeMs <= 0 || timeLeftMs <= 0) {
          return state;
        }
        return {
          type: "running",
          totalTimeMs,
          endTimeMs: now + timeLeftMs,
        };
      } else {
        const { endTimeMs, totalTimeMs } = state;

        return {
          type: "paused",
          totalTimeMs,
          timeLeftMs: Math.max(endTimeMs - now, 0),
        };
      }
    });
  }

  return (
    <div className={styles.timerWrapper}>
      <main className={styles.mainTimerSection}>
        <div className={styles.header}>
          Timer
          <button className={styles.closeButton}>x{/* TODO use icon */}</button>
        </div>
        <div className={styles.radialTimerContainer}>
          <motion.div>{animatedTimeLeftText}</motion.div>
        </div>
        <div className={styles.bottomButtonRow}>
          <button className={styles.bottomTextButton} onClick={addOneMinute}>
            +1:00
          </button>
          <button className={styles.pausePlayButton} onClick={togglePaused}>
            {timerState.type === "paused" ? ">" : "||"}
            {/* TODO use icons */}
          </button>
          <button className={styles.bottomTextButton} onClick={reset}>
            Reset
          </button>
        </div>
      </main>
    </div>
  );
}

function padLeadingZero(num: number) {
  if (num < 10) {
    return `0${num}`;
  }
  return num;
}
