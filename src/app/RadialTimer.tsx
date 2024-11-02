import {
  motion,
  MotionValue,
  PanInfo,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { MINUTE_MS, TimerState } from "./timerShared";
import { useEffect, useRef, useState } from "react";
import EditableTimeHalf from "./EditableTimeHalf";
import styles from "./RadialTimer.module.css";

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
  onTimerComplete: () => void;
}

export default function RadialTimer(props: RadialTimerProps) {
  const {
    currentTime,
    timerState,
    onDragComplete,
    onKeyboardCommand,
    onTogglePaused,
    pause,
    onEdit,
    onTimerComplete,
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

  useEffect(() => {
    return animatedTimeLeftMs.on("change", (value) => {
      if (
        timerState.type === "running" &&
        timerState.totalTimeMs >= 0 &&
        value <= 0 &&
        !dragStartInfo
      ) {
        // If we don't queue the microtask here, Framer Motion tries to run
        // this during render for some reason
        queueMicrotask(() => onTimerComplete());
      }
    });
  });

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
          data-testid="timer-drag-button"
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

            const relativeStartX = info.point.x - circleCenterXOnScreen;
            const relativeStartY = info.point.y - circleCenterYOnScreen;

            animatedDragState.set(getDragState(relativeStartX, relativeStartY));
            setDragStartInfo({ relativeStartX, relativeStartY });
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

            animatedDragState.set(
              getDragState(xDistanceFromCenter, yDistanceFromCenter)
            );
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
            testId="minutes-input"
          />{" "}
          :{" "}
          <EditableTimeHalf
            animatedValue={animatedSecondsLeft}
            onFocus={pause}
            onEdit={(newValue) => onEdit(newValue, "seconds")}
            alignText="start"
            testId="seconds-input"
          />
        </div>
      </div>
    </div>
  );
}

function getDragState(
  xDistanceFromCenter: number,
  yDistanceFromCenter: number
) {
  let angle = Math.atan2(xDistanceFromCenter, yDistanceFromCenter);

  // The angle might be negative - make it not negative
  angle = (angle + Math.PI * 2) % (Math.PI * 2);

  // The drag state is the angle as a percentage of a full rotation
  return angle / (Math.PI * 2);
}
