import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import styles from './Panels.module.scss';

// Sample data — replace with GET /admin/reports/performance
const METRICS = [
  { label: 'Conversion Rate', value: '2.35%', delta: '+12.5%', direction: 'up' },
  { label: 'Refund Rate', value: '1.25%', delta: '-5.2%', direction: 'up' },
  { label: 'Customer Satisfaction', value: '4.6/5', delta: '+8.1%', direction: 'up' },
  { label: 'Repeat Customer Rate', value: '32.4%', delta: '+15.3%', direction: 'up' },
  { label: 'Cart Abandonment Rate', value: '68.7%', delta: '-3.6%', direction: 'down' },
];

const PerformancePanel = () => (
  <div className={styles.card}>
    <div className={styles.header}>
      <h3>Store Performance</h3>
    </div>
    <ul className={styles.metricList}>
      {METRICS.map((metric) => (
        <li key={metric.label} className={styles.metricRow}>
          <span className={styles.metricLabel}>{metric.label}</span>
          <span className={styles.metricValue}>{metric.value}</span>
          <span className={clsx(styles.metricDelta, metric.direction === 'up' ? styles.deltaUp : styles.deltaDown)}>
            {metric.direction === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {metric.delta}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default PerformancePanel;
