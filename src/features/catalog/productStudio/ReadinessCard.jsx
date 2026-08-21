import { Check } from 'lucide-react';
import styles from './ReadinessCard.module.scss';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ReadinessCard = ({ items }) => {
  const doneCount = items.filter((item) => item.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <section className={styles.card}>
      <header>
        <h2>Product Readiness</h2>
      </header>

      <div className={styles.gauge}>
        <svg viewBox="0 0 100 100" width="96" height="96">
          <circle cx="50" cy="50" r={RADIUS} className={styles.track} />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            className={styles.progress}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={styles.gaugeLabel}>
          <strong>{pct}%</strong>
          <span>Ready</span>
        </div>
      </div>

      <ul className={styles.checklist}>
        {items.map((item) => (
          <li key={item.label} className={item.done ? styles.done : styles.todo}>
            <span className={styles.mark}>{item.done ? <Check size={12} /> : null}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ReadinessCard;
