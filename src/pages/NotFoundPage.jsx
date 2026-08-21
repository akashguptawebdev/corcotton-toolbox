import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '@components/ui/Button/Button';
import styles from './StatusPage.module.scss';

const NotFoundPage = () => (
  <div className={styles.fullPage}>
    <div className={styles.wrapper}>
      <Compass size={40} className={styles.icon} />
      <h1>404 — Page not found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/dashboard">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
