import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Edit3, KeyRound, Plus, RefreshCw, Save, Search, Trash2, UserCog, X } from 'lucide-react';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Avatar from '@components/ui/Avatar/Avatar';
import ImageUploadField from '@components/forms/ImageUploadField/ImageUploadField';
import { usePermission } from '@hooks/usePermission';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { ROLES, ROLE_LABELS } from '@constants/roles';
import { usersApi } from './users.api';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './StaffPage.module.scss';

const styleFor = (key) => catalogStyles[key] || styles[key];

const emptyForm = { name: '', email: '', password: '', role: ROLES.MANAGER, profilePic: '', status: 'active' };

const ASSIGNABLE_ROLES = [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

function StaffPage() {
  const { can, isSuperAdmin } = usePermission();
  const currentUserId = useSelector((state) => state.auth.user?.id);
  // role.manage — the one permission Admin is deliberately excluded from — keeps this
  // page super_admin-only, matching the backend routes (see users.routes.js).
  const canManage = can(PERMISSIONS.ROLE_MANAGE);
  const { canEdit, isEditing, startEdit, stopEdit, setIsEditing } = useEditGuard(PERMISSIONS.ROLE_MANAGE);

  const [users, setUsers] = useState([]);
  const [view, setView] = useState('list');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Only a super admin may grant super_admin access — mirrors adminUser.service.js's
  // assertAssignableRole guard, so the option isn't even offered to someone it would
  // just be rejected for server-side.
  const assignableRoles = isSuperAdmin ? ASSIGNABLE_ROLES : ASSIGNABLE_ROLES.filter((role) => role !== ROLES.SUPER_ADMIN);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const text = [user.name, user.email, user.role].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const metrics = useMemo(() => {
    const active = users.filter((user) => user.status === 'active').length;
    const admins = users.filter((user) => user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN).length;
    return { total: users.length, active, admins };
  }, [users]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.list();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load staff users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const startCreate = () => {
    if (!canManage) return;
    setForm(emptyForm);
    setEditing(null);
    setIsEditing(true); // a blank new staff user has nothing to "view" — always editable
    setError('');
    setNotice('');
    setView('form');
  };

  const closeForm = () => {
    setView('list');
    setEditing(null);
    setForm(emptyForm);
    stopEdit();
  };

  const editItem = (user) => {
    setError('');
    setNotice('');
    setEditing(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || ROLES.MANAGER,
      profilePic: user.profilePic || '',
      status: user.status || 'active',
    });
    stopEdit(); // opens read-only — Edit must be clicked (and permitted) to unlock fields
    setView('form');
  };

  const cancelEdit = () => {
    if (editing) editItem(editing);
    else closeForm();
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        profilePic: form.profilePic || null,
        ...(editing ? { status: form.status } : {}),
        ...(form.password ? { password: form.password } : {}),
      };
      if (editing) {
        await usersApi.update(editing.id, payload);
        setNotice('Staff user updated.');
      } else {
        const created = await usersApi.create(payload);
        setNotice(
          created.user?.emailDelivery?.delivered
            ? `Staff user created — a welcome email with their temporary password was sent to ${payload.email}.`
            : `Staff user created, but the welcome email could not be sent — share their temporary password with them another way.`
        );
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save staff user');
    } finally {
      setSaving(false);
    }
  };

  // Generates a brand-new temp password server-side, invalidates their current one
  // immediately (all sessions revoked), and resends the welcome email — for a lost/never-
  // arrived invite or a routine forced reset.
  const regenerateCredentials = async () => {
    if (!editing) return;
    if (!window.confirm(`Generate a new temporary password for ${editing.name} and email it to them? Their current password stops working immediately.`)) return;
    setRegenerating(true);
    setError('');
    setNotice('');
    try {
      const result = await usersApi.regenerateCredentials(editing.id);
      setNotice(
        result.user?.emailDelivery?.delivered
          ? `New temporary password generated — a reset email was sent to ${editing.email}.`
          : `New temporary password generated, but the email could not be sent — share it with them another way.`
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to regenerate password');
    } finally {
      setRegenerating(false);
    }
  };

  const remove = async (event, user) => {
    event.stopPropagation();
    if (!window.confirm(`Remove staff access for ${user.name}?`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await usersApi.remove(user.id);
      setNotice('Staff user removed.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to remove staff user');
    } finally {
      setSaving(false);
    }
  };

  const fieldsDisabled = editing ? !isEditing : false;

  const renderForm = () => (
    <form className={styleFor('editor')} onSubmit={submit}>
      <div className={styleFor('editorHeader')}>
        <div>
          <span>{editing ? (isEditing ? 'Editing' : 'Viewing') : 'Creating'}</span>
          <h2>{editing ? editing.name : 'New Staff User'}</h2>
        </div>
        <div className={styles.headerActions}>
          {editing && canManage ? (
            <button type="button" onClick={regenerateCredentials} disabled={regenerating} title="Generate a new temporary password and resend the invite email">
              <KeyRound size={16} /> {regenerating ? 'Regenerating…' : 'Regenerate Password'}
            </button>
          ) : null}
          <button type="button" onClick={closeForm}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {editing && !canEdit ? <div className={styleFor('notice')}>You have read-only access to staff users.</div> : null}

      <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
        <section className={styleFor('editorSection')}>
          <h3>Identity</h3>
          <div className={styleFor('twoCol')}>
            <label>Full Name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Jane Doe" required /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="jane@yourstore.com" required /></label>
          </div>
          <ImageUploadField label="Profile Photo" value={form.profilePic} onChange={(url) => updateField('profilePic', url)} folder="staff" />
          {editing ? (
            <label>
              Reset Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Leave blank to keep their current password"
                minLength={8}
              />
            </label>
          ) : (
            <p className={styleFor('notice')}>
              A temporary password is generated automatically and emailed to this address — they'll be asked to set their own on first sign-in.
            </p>
          )}
        </section>

        <section className={styleFor('editorSection')}>
          <h3>Access</h3>
          <div className={styleFor('twoCol')}>
            <label>
              Role
              <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
                {assignableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </label>
            {editing ? (
              <label>
                Status
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            ) : null}
          </div>
        </section>
      </fieldset>

      {editing && !isEditing ? (
        <Button type="button" onClick={startEdit} disabled={!canEdit} title={!canEdit ? "You don't have permission to edit staff users" : undefined}>
          <Edit3 size={16} /> Edit
        </Button>
      ) : (
        <div className={styles.formActions}>
          {editing ? <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button> : null}
          <button className={styleFor('primaryButton')} type="submit" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving' : editing ? 'Save Changes' : 'Create Staff User'}
          </button>
        </div>
      )}
    </form>
  );

  return (
    <section className={styleFor('page')}>
      <PageHeader
        eyebrow="Store Management / Staff"
        icon={UserCog}
        title="Staff Members"
        description="Create and manage toolbox accounts for your team — Super Admin, Admin, and Manager roles."
        meta={`${filtered.length} visible`}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>
            <Button type="button" onClick={startCreate} disabled={!canManage} title={!canManage ? "You don't have permission to create staff users" : undefined}>
              <Plus size={16} /> Add Staff User
            </Button>
          </>
        )}
      />

      {error ? <div className={styleFor('alert')}>{error}</div> : null}
      {notice ? <div className={styleFor('notice')}>{notice}</div> : null}

      {view === 'form' ? renderForm() : (
        <main className={styleFor('listShell')}>
          <section className={styleFor('summary')}>
            <div><span>Total</span><strong>{metrics.total}</strong></div>
            <div><span>Active</span><strong>{metrics.active}</strong></div>
            <div><span>Admins</span><strong>{metrics.admins}</strong></div>
            <div><span>Visible List</span><strong>{filtered.length}</strong></div>
          </section>

          <section className={styleFor('toolbar')}>
            <div className={styleFor('searchBox')}>
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or role" />
            </div>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="ALL">All roles</option>
              {ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </section>

          <section className={styleFor('cardList')}>
            {loading ? <div className={styleFor('emptyState')}>Loading...</div> : null}
            {!loading && !filtered.length ? <div className={styleFor('emptyState')}>No staff users found.</div> : null}
            {filtered.map((user) => (
              <article key={user.id} className={styleFor('recordCard')} onClick={() => editItem(user)}>
                <div className={styleFor('recordMedia')}><Avatar name={user.name} src={user.profilePic} size={40} /></div>
                <div className={styleFor('recordMain')}>
                  <div className={styleFor('recordTitle')}>
                    <strong>{user.name}</strong>
                    <mark className={`${styleFor('status')} ${user.status === 'active' ? styleFor('statusActive') : styleFor('statusInactive')}`}>
                      {user.status === 'active' ? 'Active' : 'Suspended'}
                    </mark>
                  </div>
                  <p>{user.email} · {ROLE_LABELS[user.role] || user.role}</p>
                </div>
                <div className={styleFor('recordActions')} onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => editItem(user)}><Edit3 size={16} /></button>
                  {String(user.id) !== String(currentUserId) ? (
                    <button type="button" onClick={(event) => remove(event, user)}><Trash2 size={16} /></button>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        </main>
      )}
    </section>
  );
}

export default StaffPage;
