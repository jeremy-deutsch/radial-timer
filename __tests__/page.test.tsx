import {
  getAddMinuteButton,
  getMinutesInput,
  getPlayPauseButton,
  getSecondsInput,
  getTimerDragButton,
} from "@/app/__testing__/timerTestingHelpers";
import Home from "@/app/page";
import "@testing-library/jest-dom";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { act, render, waitFor } from "@testing-library/react";
import { MotionValue } from "framer-motion";
import TimeContext from "@/app/TimeContext";

describe("Timer Page", () => {
  let injectedTime: MotionValue<number>;
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();

    injectedTime = new MotionValue();
    injectedTime.set(0);

    render(
      <TimeContext.Provider value={injectedTime}>
        <Home />
      </TimeContext.Provider>
    );
  });

  describe("at the beginning", () => {
    it("has zero minutes", () => {
      expect(getMinutesInput()).toHaveDisplayValue("00");
    });

    it("has zero seconds", () => {
      expect(getSecondsInput()).toHaveDisplayValue("00");
    });

    it("has a disabled pause/play button", () => {
      expect(getPlayPauseButton()).toBeDisabled();
    });
  });

  describe("after clicking '+1:00'", () => {
    beforeEach(() => {
      act(() => {
        getAddMinuteButton().click();
      });
    });

    it("has one minute", () => {
      expect(getMinutesInput()).toHaveDisplayValue("01");
    });

    it("has an enabled pause/play button", () => {
      expect(getPlayPauseButton()).not.toBeDisabled();
    });

    describe("and hitting the play button, then waiting 15 seconds", () => {
      beforeEach(async () => {
        act(() => {
          getPlayPauseButton().click();
        });

        act(() => {
          injectedTime.set(injectedTime.get() + 15000);
        });
      });

      it("has zero minutes", async () => {
        await waitFor(() => expect(getMinutesInput()).toHaveDisplayValue("00"));
      });

      it("has fourty-five seconds", async () => {
        await waitFor(() => expect(getSecondsInput()).toHaveDisplayValue("45"));
      });

      for (const key of ["ArrowLeft", "ArrowDown"]) {
        it(`moves the timer back when the ${key} key is pressed on the slider`, async () => {
          const slider = getTimerDragButton();

          await waitFor(() =>
            expect(getSecondsInput()).not.toHaveDisplayValue("00")
          );

          slider.focus();

          await act(async () => {
            await user.keyboard(`[${key}]`);
          });

          expect(getSecondsInput()).toHaveDisplayValue("46");
        });
      }

      for (const key of ["ArrowRight", "ArrowUp"]) {
        it(`moves the timer back when the ${key} key is pressed on the slider`, async () => {
          const slider = getTimerDragButton();

          await waitFor(() =>
            expect(getSecondsInput()).not.toHaveDisplayValue("00")
          );

          slider.focus();

          await act(async () => {
            await user.keyboard(`[${key}]`);
          });

          expect(getSecondsInput()).toHaveDisplayValue("44");
        });
      }

      it("stops moving forward after pause is clicked", async () => {
        await act(async () => {
          getPlayPauseButton().click();
        });

        injectedTime.set(injectedTime.get() + 1500);

        // Wait for framer motion listeners to complete - lots of race conditions there
        await new Promise<void>((resolve) => setTimeout(resolve, 2));

        expect(getSecondsInput()).toHaveDisplayValue("45");
      });
    });
  });
});
