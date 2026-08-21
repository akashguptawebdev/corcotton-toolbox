import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import { usePermission } from '@hooks/usePermission';
import { rbacApi } from './rbac.api';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './RolesPermissionsPage.module.scss';

const styleFor = (key) => catalogStyles[key] || styles[key];

const ROLE_COLORS = ['roleGreen', 'roleBlue', 'roleOrange', 'roleViolet', 'roleSlate'];

const humanize = (value) =>
  String(value)
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const groupByModule = (permissions) =>
  permissions.reduce((groups, permission) => {
    const moduleName = permission.group || 'general';
    (groups[moduleName] ||= []).push(permission);
    return groups;
  }, {});

function RolesPermissionsPage() {
  const { isSuperAdmin } = usePermission();
  const [matrixData, setMatrixData] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState('');

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await rbacApi.matrix();
      setMatrixData(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load roles & permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const roles = matrixData?.roles ?? [];
  const allPermissions = matrixData?.permissions ?? [];

  const allowedLookup = useMemo(() => {
    const lookup = new Map();
    for (const entry of matrixData?.matrix ?? []) lookup.set(`${entry.roleId}:${entry.permissionId}`, Boolean(entry.allowed));
    return lookup;
  }, [matrixData]);

  const filteredPermissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter((permission) => [permission.key, permission.group, permission.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)));
  }, [allPermissions, query]);

  const groupedPermissions = useMemo(() => groupByModule(filteredPermissions), [filteredPermissions]);
  const moduleCount = Object.keys(groupedPermissions).length;

  const assignedCount = useMemo(
    () => roles.reduce((sum, role) => sum + (role.permissionCount || 0), 0),
    [roles]
  );
  const totalCells = Math.max(roles.length * allPermissions.length, 1);
  const assignedPercent = Math.round((assignedCount / totalCells) * 100);

  const togglePermission = async (role, permission, nextAllowed) => {
    if (!isSuperAdmin || role.slug === 'super_admin') return;
    const key = `${role.id}:${permission.id}`;
    setSavingKey(key);
    setMatrixData((current) => ({
      ...current,
      matrix: current.matrix.map((entry) => (entry.roleId === role.id && entry.permissionId === permission.id ? { ...entry, allowed: nextAllowed } : entry)),
      roles: current.roles.map((r) => (r.id === role.id ? { ...r, permissionCount: r.permissionCount + (nextAllowed ? 1 : -1) } : r)),
    }));
    try {
      await rbacApi.updateRolePermission({ roleId: role.id, permissionId: permission.id, allowed: nextAllowed });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update permission');
      await load();
    } finally {
      setSavingKey(null);
    }
  };

  const addRole = async (event) => {
    event.preventDefault();
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    setError('');
    try {
      await rbacApi.createRole({ name: newRoleName.trim(), description: newRoleDescription.trim() || null });
      setNewRoleName('');
      setNewRoleDescription('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const removeRole = async (role) => {
    if (!window.confirm(`Delete the "${role.name}" role? This cannot be undone.`)) return;
    setError('');
    try {
      await rbacApi.removeRole(role.id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete role');
    }
  };

  return (
    <section className={clsx(styleFor('page'), styles.rolesPage)}>
      <PageHeader
        eyebrow="Access Control"
        icon={ShieldCheck}
        title="Roles & Permissions"
        description="Manage role-based access for every toolbox feature. Super Admin always has every permission and can't be edited."
        meta={isSuperAdmin ? 'Editable' : 'Read only'}
        actions={<Button type="button" variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}
      />

      {error ? <div className={styleFor('alert')}>{error}</div> : null}

      <section className={styleFor('summary')}>
        <div><span>Roles</span><strong>{roles.length}</strong></div>
        <div><span>Permissions</span><strong>{allPermissions.length}</strong></div>
        <div><span>Modules</span><strong>{moduleCount}</strong></div>
        <div><span>Coverage</span><strong>{assignedPercent}%</strong></div>
      </section>

      {isSuperAdmin ? (
        <form className={styles.addRoleForm} onSubmit={addRole}>
          <input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="New role name (e.g. Warehouse Staff)" />
          <input value={newRoleDescription} onChange={(event) => setNewRoleDescription(event.target.value)} placeholder="Description (optional)" />
          <Button type="submit" disabled={!newRoleName.trim() || creatingRole}><Plus size={16} /> {creatingRole ? 'Creating…' : 'Add Role'}</Button>
        </form>
      ) : null}

      <section className={styleFor('toolbar')}>
        <div className={styleFor('searchBox')}>
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search permissions..." />
        </div>
      </section>

      {loading && !matrixData ? (
        <div className={styleFor('emptyState')}>Loading…</div>
      ) : (
        <div className={styles.matrix} style={{ '--role-count': Math.max(roles.length, 1) }}>
          <div className={styles.matrixHead}>
            <div className={styles.permissionCell}>Permission</div>
            {roles.map((role, index) => (
              <div key={role.id} className={clsx(styles.roleCell, styles[ROLE_COLORS[index % ROLE_COLORS.length]])}>
                <span>{role.name}</span>
                <small>{role.permissionCount} perms</small>
                {isSuperAdmin && !role.isSystem ? (
                  <button type="button" className={styles.removeRoleBtn} onClick={() => removeRole(role)} title={`Delete ${role.name}`}>
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {Object.entries(groupedPermissions).map(([moduleName, permissions]) => (
            <div key={moduleName}>
              <div className={styles.moduleTitle}>{humanize(moduleName)}</div>
              {permissions.map((permission) => (
                <div key={permission.id} className={styles.matrixRow}>
                  <div className={styles.permissionCell}>
                    <strong>{permission.description || humanize(permission.key.split('.').at(-1))}</strong>
                    <span>{permission.key}</span>
                  </div>
                  {roles.map((role) => {
                    const isSuperAdminRole = role.slug === 'super_admin';
                    const key = `${role.id}:${permission.id}`;
                    const checked = isSuperAdminRole || allowedLookup.get(key);
                    return (
                      <label key={role.id} className={styles.checkCell}>
                        <input
                          type="checkbox"
                          checked={Boolean(checked)}
                          disabled={!isSuperAdmin || isSuperAdminRole || savingKey === key}
                          onChange={(event) => togglePermission(role, permission, event.target.checked)}
                        />
                        <span />
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}

          {!filteredPermissions.length ? <div className={styleFor('emptyState')}>No permissions match your search.</div> : null}
        </div>
      )}
    </section>
  );
}

export default RolesPermissionsPage;
