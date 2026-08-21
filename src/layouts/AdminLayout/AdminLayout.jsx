import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranding } from '@app/brandingSlice';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './AdminLayout.module.scss';

const AdminLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const displayName = useSelector((state) => state.branding.displayName);
  const favicon = useSelector((state) => state.branding.favicon);
  const brandingStatus = useSelector((state) => state.branding.status);

  useEffect(() => {
    if (brandingStatus === 'idle') dispatch(fetchBranding());
  }, [dispatch, brandingStatus]);

  useEffect(() => {
    document.title = `${displayName} — Toolbox`;
  }, [displayName]);

  // Falls back to index.html's default "E" mark icon until Settings → Store Settings has
  // a favicon configured.
  useEffect(() => {
    if (!favicon) return;
    const link = document.getElementById('app-favicon');
    if (link) link.href = favicon;
  }, [favicon]);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <main className={styles.content}>
          <Outlet key={location.key} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
