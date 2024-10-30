import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.timerWrapper}>
      <main className={styles.mainTimerSection}>
        <div className={styles.header}>
          Timer
          <button className={styles.closeButton}>x{/* TODO use icon */}</button>
        </div>
        <div className={styles.radialTimerContainer}>Timer goes here!</div>
        <div className={styles.bottomButtonRow}>
          <button className={styles.bottomTextButton}>+1:00</button>
          <button className={styles.pausePlayButton}>
            ||
            {/* TODO use icon */}
          </button>
          <button className={styles.bottomTextButton}>Reset</button>
        </div>
      </main>
    </div>
  );
}
