import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { bootstrapAuth } from '@features/auth/authSlice';
import { router } from './router';
import styles from './AppBootstrap.module.scss';

// On first load, silently try to exchange the httpOnly refresh cookie (if any) for
// an access token, so a returning admin lands on their last page instead of /login.
// Nothing renders until this resolves — avoids a login-page flash for an already
// authenticated session.
const AppBootstrap = () => {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.auth.status);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  if (status === 'idle' || status === 'checking') {
    return (
      <div className={styles.splash}>
        <Loader2 size={28} className={styles.spinner} />
      </div>
    );
  }

  return <RouterProvider router={router} />;
};

export default AppBootstrap;
