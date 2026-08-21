import { useDispatch, useSelector } from 'react-redux';
import { Search, Bell, Moon, Sun, ChevronDown, LogOut, UserCircle, Menu, Mail } from 'lucide-react';
import { toggleSidebar, toggleTheme } from '@app/uiSlice';
import { logout } from '@features/auth/authSlice';
import { ROLE_LABELS } from '@constants/roles';
import Avatar from '@components/ui/Avatar/Avatar';
import Dropdown from '@components/ui/Dropdown/Dropdown';
import styles from './Topbar.module.scss';

const Topbar = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);
  const user = useSelector((state) => state.auth.user);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={() => dispatch(toggleSidebar())} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <div className={styles.search}>
          <Search size={16} />
          <input placeholder="Search anything..." />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.iconButton} onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className={styles.iconButton} aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.badge}>8</span>
        </button>

        <button className={styles.iconButton} aria-label="Messages">
          <Mail size={18} />
          <span className={styles.badge}>5</span>
        </button>

        <Dropdown
          trigger={
            <div className={styles.userTrigger}>
              <Avatar name={user?.name || 'Admin'} size={34} />
              <div className={styles.userMeta}>
                <span className={styles.userName}>{user?.name || 'Admin'}</span>
                <span className={styles.userRole}>{ROLE_LABELS[user?.role] || user?.role}</span>
              </div>
              <ChevronDown size={16} />
            </div>
          }
        >
          <button className={styles.menuItem}>
            <UserCircle size={16} /> My profile
          </button>
          <button className={styles.menuItem} onClick={() => dispatch(logout())}>
            <LogOut size={16} /> Sign out
          </button>
        </Dropdown>
      </div>
    </header>
  );
};

export default Topbar;
