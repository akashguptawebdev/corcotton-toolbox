import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '@components/ui/Button/Button';
import styles from './StatusPage.module.scss';

const ForbiddenPage = () => (
  <div className={styles.fullPage}>
    <div className={styles.wrapper}>
      <ShieldAlert size={40} className={styles.iconCritical} />
      <h1>403 — Access denied</h1>
      <p>Your role doesn&apos;t have permission to view this page. Contact a Super Admin if you believe this is a mistake.</p>
      <Link to="/dashboard">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  </div>
);

export default ForbiddenPage;
