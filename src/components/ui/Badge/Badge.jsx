import clsx from 'clsx';
import styles from './Badge.module.scss';

// tone: 'good' | 'warning' | 'serious' | 'critical' | 'neutral' — status colors are
// reserved (dataviz skill: never reused as a categorical series color) and always
// paired with a text label, never color alone.
const Badge = ({ tone = 'neutral', children, className }) => (
  <span className={clsx(styles.badge, styles[tone], className)}>{children}</span>
);

export default Badge;
