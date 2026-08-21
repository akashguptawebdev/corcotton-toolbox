import clsx from 'clsx';
import styles from './Avatar.module.scss';

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const Avatar = ({ name, src, size = 36, className }) => (
  <span className={clsx(styles.avatar, className)} style={{ width: size, height: size, fontSize: size * 0.4 }}>
    {src ? <img src={src} alt={name} /> : getInitials(name)}
  </span>
);

export default Avatar;
