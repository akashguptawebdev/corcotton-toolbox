import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './Dropdown.module.scss';

// Minimal accessible popover: click trigger to open, click outside or Escape to close.
// Usage: <Dropdown trigger={<IconButton />} align="right"><MenuItems /></Dropdown>
const Dropdown = ({ trigger, align = 'right', children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={clsx(styles.panel, align === 'right' ? styles.alignRight : styles.alignLeft)} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
