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
import { useRef, useState } from "react";

// We store whatever's *not* frequently changing in state.
// If the timer's paused, that's the amount of time left; if the timer's
// running, it's the timer's end time.
type TimerState =
  | { type: "paused"; totalTimeMs: number; timeLeftMs: number }
  | { type: "running"; totalTimeMs: number; endTimeMs: number };

interface DragState {
  // The starting X and Y positions of the cursor drag
  // relative to the center of the timer circle.
  relativeStartX: number;
  relativeStartY: number;
}

const MINUTE_MS = 60 * 1000;

const INITIAL_TIMER_STATE: TimerState = {
  type: "paused",
  totalTimeMs: 0,
  timeLeftMs: 0,
};

const CIRCLE_RADIUS = 100;
const CIRCLE_X = 200;
const CIRCLE_Y = 120;

const DRAG_BUTTON_RADIUS = 10;

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

  return (
    <div className={styles.timerWrapper}>
      <main className={styles.mainTimerSection}>
        <div className={styles.header}>
          Timer
          <button className={styles.closeButton}>x{/* TODO use icon */}</button>
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
        />
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

interface RadialTimerProps {
  currentTime: MotionValue<number>;
  timerState: TimerState;
  onDragComplete: (dragPercentage: number) => void;
}

function RadialTimer(props: RadialTimerProps) {
  const { currentTime, timerState, onDragComplete: onEndTimerDrag } = props;

  const radialTimerContainerRef = useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);

  // Percentage value between zero and 1
  const animatedDragState = useMotionValue(0);

  const animatedTimeLeftMs = useTransform(() => {
    if (dragState) {
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
    return positionRelativeToCircleCenter + CIRCLE_X - DRAG_BUTTON_RADIUS;
  });

  const animatedTimerDragButtonY = useTransform(() => {
    const timeLeftPercentage = animatedTimeLeftPercentage.get();
    // We use cosine, not sine, because the circle is turned 90 degrees left.
    const positionRelativeToCircleCenter =
      Math.cos(timeLeftPercentage * 2 * Math.PI) * CIRCLE_RADIUS;

    // Subtract, don't add, because in the browser down is positive and up is negative
    return CIRCLE_Y - positionRelativeToCircleCenter - DRAG_BUTTON_RADIUS;
  });

  const animatedTimeLeftText = useTransform(() => {
    const ms = animatedTimeLeftMs.get();
    const minutes = Math.floor(ms / MINUTE_MS);
    const seconds = Math.floor((ms % MINUTE_MS) / 1000);
    return `${padLeadingZero(minutes)}:${padLeadingZero(seconds)}`;
  });

  return (
    <div className={styles.radialTimerContainer} ref={radialTimerContainerRef}>
      {/* TODO give this proper accessible slider controls */}
      <motion.button
        className={styles.radialTimerDragButton}
        aria-label="draggable radial timer button"
        style={{
          x: animatedTimerDragButtonX,
          y: animatedTimerDragButtonY,
          "--drag-button-radius": `${DRAG_BUTTON_RADIUS}px`,
        }}
        onPanStart={(e: Event, info: PanInfo) => {
          const container = radialTimerContainerRef.current;
          if (!container) {
            return;
          }
          const containerPosition = container.getBoundingClientRect();
          const circleCenterXOnScreen = containerPosition.left + CIRCLE_X;
          const circleCenterYOnScreen = containerPosition.top + CIRCLE_Y;

          setDragState({
            relativeStartX: info.point.x - circleCenterXOnScreen,
            relativeStartY: info.point.y - circleCenterYOnScreen,
          });
        }}
        onPanEnd={() => {
          const currentDragStateValue = animatedDragState.get();
          onEndTimerDrag(currentDragStateValue);
          setDragState(null);
        }}
        onPan={(e: Event, info: PanInfo) => {
          const container = radialTimerContainerRef.current;
          if (!container || !dragState) {
            return;
          }
          const xDistanceFromCenter = info.offset.x + dragState.relativeStartX;

          // Make Y negative - our trig assumes Y is up, but in the browser, Y is down
          const yDistanceFromCenter = -(
            info.offset.y + dragState.relativeStartY
          );

          let angle = Math.atan2(xDistanceFromCenter, yDistanceFromCenter);

          // The angle might be negative - make it not negative
          angle = (angle + Math.PI * 2) % (Math.PI * 2);

          animatedDragState.set(angle / (Math.PI * 2));
        }}
      />
      <motion.svg>
        <circle
          className={styles.radialTimerBackCircle}
          r={CIRCLE_RADIUS}
          cx={CIRCLE_X}
          cy={CIRCLE_Y}
        />
        <motion.circle
          className={styles.radialTimerFrontCircle}
          pathLength={animatedTimeLeftPercentage}
          transform={`rotate(-90 ${CIRCLE_X} ${CIRCLE_Y})`}
          r={CIRCLE_RADIUS}
          cx={CIRCLE_X}
          cy={CIRCLE_Y}
        />
      </motion.svg>
      <motion.div className={styles.timerText}>
        {animatedTimeLeftText}
      </motion.div>
    </div>
  );
}

function padLeadingZero(num: number) {
  if (num < 10) {
    return `0${num}`;
  }
  return num;
}
