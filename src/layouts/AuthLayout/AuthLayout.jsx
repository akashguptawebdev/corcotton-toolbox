import { Outlet, useLocation } from 'react-router-dom';
import styles from './AuthLayout.module.scss';

const AuthLayout = () => {
  const location = useLocation();

  if (location.pathname === '/login') {
    return <Outlet />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>C</span>
          <span className={styles.logoName}>{import.meta.env.VITE_APP_NAME || 'Ecomm Engine'}</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
