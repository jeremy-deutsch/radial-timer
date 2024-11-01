import { MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import styles from "./EditableTimeHalf.module.css";

interface EditableTimeHalfProps {
  animatedValue: MotionValue<number>;
  onFocus: () => void;
  onEdit: (newValue: number) => void;
  alignText: "start" | "end";
  testId: string;
}

export default function EditableTimeHalf(props: EditableTimeHalfProps) {
  const { animatedValue, onFocus, onEdit, alignText, testId } = props;

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
      data-testid={testId}
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
