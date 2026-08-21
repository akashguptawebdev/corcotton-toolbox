import clsx from 'clsx';
import styles from './PageHeader.module.scss';

const PageHeader = ({ eyebrow, title, description, icon: Icon, actions, meta, className }) => (
  <header className={clsx(styles.header, className)}>
    <div className={styles.titleBlock}>
      {eyebrow ? (
        <div className={styles.eyebrow}>
          {Icon ? <Icon size={15} /> : null}
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <div className={styles.titleRow}>
        <h1>{title}</h1>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </div>
      {description ? <p>{description}</p> : null}
    </div>
    {actions ? <div className={styles.actions}>{actions}</div> : null}
  </header>
);

export default PageHeader;
