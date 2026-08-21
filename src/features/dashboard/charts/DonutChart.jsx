import { useSelector } from 'react-redux';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORICAL } from '../chartPalette';
import styles from './DonutChart.module.scss';

// Categorical palette used in FIXED order (dataviz skill non-negotiable — never
// cycled/reassigned). Three slots (aqua, yellow, magenta) sit below 3:1 contrast on
// the light surface, so the relief rule applies: every segment gets a visible label
// in the legend rows (value + %), never color as the only signal.
const DonutChart = ({ title, data, totalLabel = 'Total', viewAllHref }) => {
  const theme = useSelector((state) => state.ui.theme);
  const colors = CATEGORICAL[theme];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>{title}</h3>
        {viewAllHref && <a href={viewAllHref}>View All</a>}
      </div>

      <div className={styles.body}>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.center}>
            <span className={styles.centerValue}>{total >= 1000 ? `$${(total / 1000).toFixed(1)}K` : total.toLocaleString()}</span>
            <span className={styles.centerLabel}>{totalLabel}</span>
          </div>
        </div>

        <ul className={styles.legend}>
          {data.map((entry, i) => (
            <li key={entry.name}>
              <span className={styles.swatch} style={{ background: colors[i % colors.length] }} />
              <span className={styles.legendName}>{entry.name}</span>
              <span className={styles.legendValue}>{entry.display ?? entry.value.toLocaleString()}</span>
              <span className={styles.legendPct}>{((entry.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DonutChart;
