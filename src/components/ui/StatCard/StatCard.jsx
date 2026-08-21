import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import styles from './StatCard.module.scss';

// deltaDirection: 'up' | 'down' — mapped to status colors (good/critical), never
// color alone: always paired with the arrow icon and the numeric label.
const StatCard = ({ icon: Icon, label, value, delta, deltaDirection = 'up', iconTone = 'primary', trendTone = 'primary', trend }) => {
  const chartData = trend?.map((point, index) => ({ index, value: point }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.label}>{label}</p>
        <span className={clsx(styles.iconWrap, styles[iconTone])}>
          <Icon size={20} />
        </span>
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
      </div>
      {delta && (
        <p className={clsx(styles.delta, deltaDirection === 'up' ? styles.deltaUp : styles.deltaDown)}>
          {deltaDirection === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta} vs last 30 days
        </p>
      )}
      {chartData && (
        <div className={styles.sparkline} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 0, bottom: 2, left: 0 }}>
              <YAxis domain={['dataMin - 4', 'dataMax + 4']} hide />
              <Line
                type="monotone"
                dataKey="value"
                stroke={`var(--spark-${trendTone})`}
                strokeWidth={2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StatCard;
