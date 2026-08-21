import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.scss';

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}) => (
  <button
    type={type}
    className={clsx(styles.button, styles[variant], styles[size], className)}
    disabled={disabled || loading}
    {...rest}
  >
    {loading && <Loader2 className={styles.spinner} size={16} />}
    {children}
  </button>
);

export default Button;
