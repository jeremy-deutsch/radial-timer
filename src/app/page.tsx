"use client";

import { useTime } from "framer-motion";
import styles from "./page.module.css";
import { useContext, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPause, faPlay } from "@fortawesome/free-solid-svg-icons";
import { MINUTE_MS, type TimerState } from "./timerShared";
import RadialTimer from "./RadialTimer";
import TimeContext from "./TimeContext";

const INITIAL_TIMER_STATE: TimerState = {
  type: "paused",
  totalTimeMs: 0,
  timeLeftMs: 0,
};

export default function Home() {
  let currentTime = useTime();
  const injectedTime = useContext(TimeContext);
  if (injectedTime) {
    currentTime = injectedTime;
  }

  const [dialogVisible, setDialogVisible] = useState(false);

  const [timerState, setTimerState] = useState<TimerState>(INITIAL_TIMER_STATE);

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

  function pause() {
    const now = currentTime.get();
    setTimerState((state) => {
      if (state.type === "paused") {
        return state;
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
          <button className={styles.closeButton} onClick={() => window.close()}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <RadialTimer
          currentTime={currentTime}
          timerState={timerState}
          onDragComplete={(dragPercentage) => {
            setTimerState((state) => {
              const totalTimeMs = state.totalTimeMs;
              const timeLeftMs = totalTimeMs * dragPercentage;
              const now = currentTime.get();
              if (state.type === "paused") {
                return { type: "paused", totalTimeMs, timeLeftMs };
              }
              return {
                type: "running",
                totalTimeMs,
                endTimeMs: now + timeLeftMs,
              };
            });
          }}
          onKeyboardCommand={(keyboardCommand) => {
            const now = currentTime.get();
            setTimerState((state) => {
              let timeLeftMs;
              if (state.type === "paused") {
                timeLeftMs = state.timeLeftMs;
              } else {
                timeLeftMs = state.endTimeMs - now;
              }

              if (keyboardCommand === "decrement") {
                timeLeftMs += 1000;
              } else if (keyboardCommand === "increment") {
                timeLeftMs -= 1000;
              } else if (keyboardCommand === "start") {
                timeLeftMs = state.totalTimeMs;
              } else if (keyboardCommand === "end") {
                timeLeftMs = 0;
              }

              return {
                type: "paused",
                totalTimeMs: Math.max(state.totalTimeMs, timeLeftMs),
                timeLeftMs: Math.max(timeLeftMs, 0),
              };
            });
          }}
          onTogglePaused={togglePaused}
          pause={pause}
          onEdit={(inputAmount, fieldName) => {
            const now = currentTime.get();
            setTimerState((state) => {
              let timeLeftMs: number;

              if (state.type === "paused") {
                timeLeftMs = state.timeLeftMs;
              } else {
                timeLeftMs = state.endTimeMs - now;
              }

              let newTimeLeftMs: number;
              if (fieldName === "minutes") {
                newTimeLeftMs =
                  inputAmount * MINUTE_MS + (timeLeftMs % MINUTE_MS);
              } else {
                const minutesLeftMs = timeLeftMs - (timeLeftMs % MINUTE_MS);
                newTimeLeftMs = inputAmount * 1000 + minutesLeftMs;
              }

              return {
                type: "paused",
                totalTimeMs: Math.max(state.totalTimeMs, newTimeLeftMs),
                timeLeftMs: newTimeLeftMs,
              };
            });
          }}
          onTimerComplete={() => {
            reset();

            setDialogVisible(true);
          }}
        />
        <div className={styles.bottomButtonRow}>
          <button
            className={styles.bottomTextButton}
            onClick={addOneMinute}
            data-testid="add-minute-button"
          >
            +1:00
          </button>
          <button
            className={styles.pausePlayButton}
            onClick={togglePaused}
            disabled={
              timerState.type === "paused" && timerState.timeLeftMs <= 0
            }
            aria-label={
              timerState.type === "paused" ? "start timer" : "pause timer"
            }
            data-testid="play-pause-button"
          >
            <FontAwesomeIcon
              icon={timerState.type === "paused" ? faPlay : faPause}
            />
          </button>
          <button
            className={styles.bottomTextButton}
            onClick={reset}
            data-testid="reset-button"
          >
            Reset
          </button>
        </div>
      </main>
      {dialogVisible && (
        <div className={styles.timeUpDialog}>
          <div className={styles.timeUpDialogModal}>
            Ding dong! Time&lsquo;s up!
            <button
              aria-label="Close dialog"
              onClick={() => setDialogVisible(false)}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
