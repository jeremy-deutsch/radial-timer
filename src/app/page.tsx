"use client";

import {
  motion,
  MotionValue,
  PanInfo,
  useMotionValue,
  useTime,
  useTransform,
} from "framer-motion";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPause, faPlay } from "@fortawesome/free-solid-svg-icons";

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
          <button className={styles.closeButton}>
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
        />
        <div className={styles.bottomButtonRow}>
          <button className={styles.bottomTextButton} onClick={addOneMinute}>
            +1:00
          </button>
          <button className={styles.pausePlayButton} onClick={togglePaused}>
            <FontAwesomeIcon
              icon={timerState.type === "paused" ? faPlay : faPause}
            />
          </button>
          <button className={styles.bottomTextButton} onClick={reset}>
            Reset
          </button>
        </div>
      </main>
    </div>
  );
}

const CIRCLE_RADIUS = 90;
const CIRCLE_CENTER_X = 150;
const CIRCLE_CENTER_Y = 120;

const DRAG_BUTTON_RADIUS = 10;

const DECREMENTING_KEYS = ["ArrowLeft", "ArrowDown"];
const INCREMENTING_KEYS = ["ArrowRight", "ArrowUp"];

// The starting X and Y positions of the cursor drag relative to the center of the timer circle.
// Used to calculate the angle of subsequent drag positions relative to that center, without
// calling getBoundingClientRect() in a hot function.
interface DragStartInfo {
  relativeStartX: number;
  relativeStartY: number;
}

interface RadialTimerProps {
  currentTime: MotionValue<number>;
  timerState: TimerState;
  onDragComplete: (dragPercentage: number) => void;
  onKeyboardCommand: (
    keyboardCommand: "increment" | "decrement" | "start" | "end"
  ) => void;
  onTogglePaused: () => void;
  pause: () => void;
  onEdit: (amount: number, field: "minutes" | "seconds") => void;
}

function RadialTimer(props: RadialTimerProps) {
  const {
    currentTime,
    timerState,
    onDragComplete,
    onKeyboardCommand,
    onTogglePaused,
    pause,
    onEdit,
  } = props;

  const radialTimerContainerRef = useRef<HTMLDivElement>(null);

  // If we're dragging, this is the start position of the drag relative to the center
  // of the circle. Otherwise it's null.
  const [dragStartInfo, setDragStartInfo] = useState<DragStartInfo | null>(
    null
  );

  // Percentage value between zero and 1
  const animatedDragState = useMotionValue(0);

  const animatedTimeLeftMs = useTransform(() => {
    if (dragStartInfo) {
      return animatedDragState.get() * timerState.totalTimeMs;
    }

    if (timerState.type === "paused") {
      return timerState.timeLeftMs;
    }
    return timerState.endTimeMs - currentTime.get();
  });

  const animatedTimeLeftPercentage = useTransform(() => {
    if (timerState.totalTimeMs <= 0) {
      return 1;
    }
    return animatedTimeLeftMs.get() / timerState.totalTimeMs;
  });

  const animatedTimerDragButtonX = useTransform(() => {
    const timeLeftPercentage = animatedTimeLeftPercentage.get();
    // We use sine, not cosine, because the circle is turned 90 degrees left.
    const positionRelativeToCircleCenter =
      Math.sin(timeLeftPercentage * 2 * Math.PI) * CIRCLE_RADIUS;
    return (
      positionRelativeToCircleCenter + CIRCLE_CENTER_X - DRAG_BUTTON_RADIUS
    );
  });

  const animatedTimerDragButtonY = useTransform(() => {
    const timeLeftPercentage = animatedTimeLeftPercentage.get();
    // We use cosine, not sine, because the circle is turned 90 degrees left.
    const positionRelativeToCircleCenter =
      Math.cos(timeLeftPercentage * 2 * Math.PI) * CIRCLE_RADIUS;

    // Subtract, don't add, because in the browser down is positive and up is negative
    return (
      CIRCLE_CENTER_Y - positionRelativeToCircleCenter - DRAG_BUTTON_RADIUS
    );
  });

  const animatedMinutesLeft = useTransform(() => {
    const ms = animatedTimeLeftMs.get();
    return Math.floor(ms / MINUTE_MS);
  });

  const animatedSecondsLeft = useTransform(() => {
    const ms = animatedTimeLeftMs.get();
    return Math.floor((ms % MINUTE_MS) / 1000);
  });

  const dragButtonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Set the aria values on the slider manually, without using React,
    // so we don't have frequent re-renders.
    if (dragButtonRef.current) {
      dragButtonRef.current.setAttribute("aria-valuenow", "0");
      dragButtonRef.current.setAttribute(
        "aria-valuetext",
        "0 minutes and 0 seconds"
      );
    }

    return animatedTimeLeftMs.on("change", (ms) => {
      if (!dragButtonRef.current) {
        return;
      }
      dragButtonRef.current.setAttribute(
        "aria-valuenow",
        String(Math.floor(ms / 1000))
      );

      const minutes = Math.floor(ms / MINUTE_MS);
      const secondsMinusMinutes = Math.floor((ms % MINUTE_MS) / 1000);

      dragButtonRef.current.setAttribute(
        "aria-valuetext",
        `${minutes} minute${
          minutes !== 1 ? "s" : ""
        } and ${secondsMinusMinutes} second${
          secondsMinusMinutes !== 1 ? "s" : ""
        }`
      );
    });
  }, [animatedTimeLeftMs]);

  return (
    <div className={styles.radialTimerOuterWrapper}>
      <div
        className={styles.radialTimerContainer}
        ref={radialTimerContainerRef}
        style={{
          // @ts-expect-error custom property is unexpected by TS
          "--circle-center-y": `${CIRCLE_CENTER_Y}px`,
        }}
      >
        <motion.button
          ref={dragButtonRef}
          className={styles.radialTimerDragButton}
          aria-label="draggable radial timer button"
          role="slider"
          aria-valuemin="0"
          aria-valuemax={Math.floor(timerState.totalTimeMs / 1000)}
          style={{
            x: animatedTimerDragButtonX,
            y: animatedTimerDragButtonY,
            "--drag-button-radius": `${DRAG_BUTTON_RADIUS}px`,
          }}
          onKeyDown={(e: KeyboardEvent) => {
            if (INCREMENTING_KEYS.includes(e.key)) {
              onKeyboardCommand("increment");
            } else if (DECREMENTING_KEYS.includes(e.key)) {
              onKeyboardCommand("decrement");
            } else if (e.key === "Home") {
              onKeyboardCommand("start");
            } else if (e.key === "End") {
              onKeyboardCommand("end");
            }
          }}
          onKeyUp={(e: KeyboardEvent) => {
            if (e.key === " ") {
              onTogglePaused();
            }
          }}
          onPanStart={(e: Event, info: PanInfo) => {
            const container = radialTimerContainerRef.current;
            if (!container) {
              return;
            }

            dragButtonRef.current?.focus();

            const containerPosition = container.getBoundingClientRect();
            const circleCenterXOnScreen =
              containerPosition.left + CIRCLE_CENTER_X;
            const circleCenterYOnScreen =
              containerPosition.top + CIRCLE_CENTER_Y;

            setDragStartInfo({
              relativeStartX: info.point.x - circleCenterXOnScreen,
              relativeStartY: info.point.y - circleCenterYOnScreen,
            });
          }}
          onPanEnd={() => {
            const currentDragStateValue = animatedDragState.get();
            onDragComplete(currentDragStateValue);
            setDragStartInfo(null);
          }}
          onPan={(e: Event, info: PanInfo) => {
            const container = radialTimerContainerRef.current;
            if (!container || !dragStartInfo) {
              return;
            }

            const xDistanceFromCenter =
              info.offset.x + dragStartInfo.relativeStartX;

            // Make Y negative - our trig assumes Y is up, but in the browser, Y is down
            const yDistanceFromCenter = -(
              info.offset.y + dragStartInfo.relativeStartY
            );

            let angle = Math.atan2(xDistanceFromCenter, yDistanceFromCenter);

            // The angle might be negative - make it not negative
            angle = (angle + Math.PI * 2) % (Math.PI * 2);

            // Set the drag state to the angle as a percentage of a full rotation
            animatedDragState.set(angle / (Math.PI * 2));
          }}
        />
        <motion.svg>
          <circle
            className={styles.radialTimerBackCircle}
            r={CIRCLE_RADIUS}
            cx={CIRCLE_CENTER_X}
            cy={CIRCLE_CENTER_Y}
          />
          <motion.circle
            className={styles.radialTimerFrontCircle}
            pathLength={animatedTimeLeftPercentage}
            transform={`rotate(-90 ${CIRCLE_CENTER_X} ${CIRCLE_CENTER_Y})`}
            r={CIRCLE_RADIUS}
            cx={CIRCLE_CENTER_X}
            cy={CIRCLE_CENTER_Y}
            strokeLinecap="round"
          />
        </motion.svg>
        <div className={styles.timerInputsWrapper}>
          <EditableTimeHalf
            animatedValue={animatedMinutesLeft}
            onFocus={pause}
            onEdit={(newValue) => onEdit(newValue, "minutes")}
            alignText="end"
          />{" "}
          :{" "}
          <EditableTimeHalf
            animatedValue={animatedSecondsLeft}
            onFocus={pause}
            onEdit={(newValue) => onEdit(newValue, "seconds")}
            alignText="start"
          />
        </div>
      </div>
    </div>
  );
}

interface EditableTimeHalfProps {
  animatedValue: MotionValue<number>;
  onFocus: () => void;
  onEdit: (newValue: number) => void;
  alignText: "start" | "end";
}

function EditableTimeHalf(props: EditableTimeHalfProps) {
  const { animatedValue, onFocus, onEdit, alignText } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = padLeadingZero(animatedValue.get());
    }

    return animatedValue.on("change", (value) => {
      if (inputRef.current && inputRef.current !== document.activeElement) {
        inputRef.current.value = padLeadingZero(value);
      }
    });
  }, [animatedValue]);

  return (
    <input
      ref={inputRef}
      className={styles.timeHalfInput}
      type="number"
      onFocus={onFocus}
      onChange={(e) => {
        onEdit(Math.max(e.target.valueAsNumber || 0, 0));
      }}
      onBlur={(e) => {
        e.target.value = padLeadingZero(animatedValue.get());
      }}
      defaultValue="00"
      style={{ textAlign: alignText }}
    />
  );
}

function padLeadingZero(num: number) {
  if (num < 10) {
    return `0${num}`;
  }
  return String(num);
}
