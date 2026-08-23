import { useSelector } from 'react-redux';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { CATEGORICAL } from '@features/dashboard/chartPalette';
import styles from './AnalyticsPanel.module.scss';

const AnalyticsPanel = ({ title, donut, sections = [], actionLabel }) => {
  const theme = useSelector((state) => state.ui.theme);
  const palette = CATEGORICAL[theme === 'dark' ? 'dark' : 'light'];

  return (
    <aside className={styles.panel}>
      <h2>{title}</h2>

      {donut ? (
        <div className={styles.donutRow}>
          <div className={styles.donut}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut.items}
                  dataKey="value"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {donut.items.map((entry, index) => (
                    <Cell key={entry.label} fill={entry.color || palette[index % palette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCenter}>
              <strong>{donut.total}</strong>
              <span>{donut.label}</span>
            </div>
          </div>

          <ul className={styles.legend}>
            {donut.items.map((item, index) => (
              <li key={item.label}>
                <span className={styles.swatch} style={{ background: item.color || palette[index % palette.length] }} />
                <span>{item.label}</span>
                <strong>{item.meta}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h3>{section.title}</h3>
          <ul className={styles.metricList}>
            {section.items.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                {item.tone ? <span className={`${styles.dot} ${styles[item.tone]}`} /> : null}
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {actionLabel ? (
        <button type="button" className={styles.linkButton}>
          {actionLabel} <ArrowRight size={14} />
        </button>
      ) : null}
    </aside>
  );
};

export default AnalyticsPanel;
