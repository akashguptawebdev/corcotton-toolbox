import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronsLeft, Cloud } from 'lucide-react';
import clsx from 'clsx';
import { NAV_SECTIONS } from '@constants/navigation';
import { usePermission } from '@hooks/usePermission';
import { toggleSidebar } from '@app/uiSlice';
import { useDispatch } from 'react-redux';
import styles from './Sidebar.module.scss';

const Sidebar = () => {
  const dispatch = useDispatch();
  const collapsed = useSelector((state) => state.ui.sidebarCollapsed);
  const displayName = useSelector((state) => state.branding.displayName);
  const logo = useSelector((state) => state.branding.logo);
  const { can, isSuperAdmin } = usePermission();

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
      <div className={styles.brand}>
        <span className={styles.logoMark}>
          {logo ? <img src={logo} alt="" /> : <Cloud size={21} />}
        </span>
        {!collapsed && <span className={styles.logoName}>{displayName}</span>}
      </div>

      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section, index) => {
          // `restricted` items are previewed by super_admin only — everyone else's
          // permission grant is ignored for them until the feature is actually released
          // (see navigation.js). Super admin's bypass means they truly see every route.
          const visibleItems = section.items.filter((item) => can(item.permission) && (!item.restricted || isSuperAdmin));
          if (visibleItems.length === 0) return null;

          const isPinned = index === NAV_SECTIONS.length - 1;

          return (
            <div key={section.label || `section-${index}`} className={clsx(styles.section, isPinned && styles.pinnedSection)}>
              {section.label && !collapsed && <p className={styles.sectionLabel}>{section.label}</p>}
              <ul>
                {visibleItems.map(({ label, path, icon: Icon }) => (
                  <li key={path}>
                    <NavLink
                      to={path}
                      className={({ isActive }) => clsx(styles.navItem, isActive && styles.active, isPinned && styles.pinnedItem)}
                      title={collapsed ? label : undefined}
                    >
                      <Icon size={18} strokeWidth={2} />
                      {!collapsed && <span>{label}</span>}
                      {!collapsed && label === 'Orders' && <span className={styles.itemBadge}>32</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <button className={styles.collapseToggle} onClick={() => dispatch(toggleSidebar())} aria-label="Toggle sidebar">
        <ChevronsLeft size={16} className={clsx(collapsed && styles.flipped)} />
      </button>
    </aside>
  );
};

export default Sidebar;
