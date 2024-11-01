import { screen } from "@testing-library/dom";

export function getMinutesInput(): HTMLInputElement {
  return screen.getByTestId("minutes-input");
}

export function getSecondsInput(): HTMLInputElement {
  return screen.getByTestId("seconds-input");
}

export function getTimerDragButton(): HTMLButtonElement {
  return screen.getByTestId("timer-drag-button");
}

export function getAddMinuteButton(): HTMLButtonElement {
  return screen.getByTestId("add-minute-button");
}

export function getPlayPauseButton(): HTMLButtonElement {
  return screen.getByTestId("play-pause-button");
}

export function getResetButton(): HTMLButtonElement {
  return screen.getByTestId("reset-button");
}
