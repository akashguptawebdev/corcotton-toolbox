import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit3, ListTree } from 'lucide-react';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Button from '@components/ui/Button/Button';
import LinkUrlInput from '@components/forms/LinkUrlInput/LinkUrlInput';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { catalogApi } from '@features/catalog/catalog.api';
import { menusApi } from '@features/navigation/navigation.api';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './MenusPage.module.scss';

const LINK_TYPES = [
  { value: 'category', label: 'Category' },
  { value: 'collection', label: 'Collection' },
  { value: 'custom', label: 'Custom link' },
  { value: 'group', label: 'Group (no link)' },
];

const genId = () => `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const newItem = () => ({ id: genId(), label: '', linkType: 'category', categorySlug: '', collectionSlug: '', url: '', children: [] });

// --- immutable tree helpers (operate on the whole items array by id, recursively) ---
const mapById = (items, id, fn) =>
  items.map((item) => (item.id === id ? fn(item) : { ...item, children: mapById(item.children || [], id, fn) }));

const removeById = (items, id) =>
  items.filter((item) => item.id !== id).map((item) => ({ ...item, children: removeById(item.children || [], id) }));

const addChildById = (items, parentId, child) => {
  if (parentId === null) return [...items, child];
  return items.map((item) =>
    item.id === parentId ? { ...item, children: [...(item.children || []), child] } : { ...item, children: addChildById(item.children || [], parentId, child) }
  );
};

const moveSiblingById = (items, id, direction) => {
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return items.map((item) => ({ ...item, children: moveSiblingById(item.children || [], id, direction) }));
};

// Module-level (not defined inside MenusPage's render body) — recurses into its own
// children. A component redefined every render would remount its whole subtree on every
// keystroke, killing input focus.
const MenuItemRow = ({ item, depth, siblings, index, categories, collections, fieldsDisabled, onUpdateItem, onRemoveItem, onAddChild, onMoveItem }) => {
  const canMoveUp = index > 0;
  const canMoveDown = index < siblings.length - 1;

  return (
    <div className={styles.menuItem}>
      <div className={styles.menuItemRow} style={{ marginLeft: depth * 24 }}>
        <input
          placeholder="Label"
          value={item.label}
          onChange={(event) => onUpdateItem(item.id, { label: event.target.value })}
          disabled={fieldsDisabled}
        />
        <select value={item.linkType} onChange={(event) => onUpdateItem(item.id, { linkType: event.target.value })} disabled={fieldsDisabled}>
          {LINK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {item.linkType === 'category' ? (
          <select value={item.categorySlug || ''} onChange={(event) => onUpdateItem(item.id, { categorySlug: event.target.value })} disabled={fieldsDisabled}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.displayName || category.name}
              </option>
            ))}
          </select>
        ) : null}

        {item.linkType === 'collection' ? (
          <select value={item.collectionSlug || ''} onChange={(event) => onUpdateItem(item.id, { collectionSlug: event.target.value })} disabled={fieldsDisabled}>
            <option value="">Select collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.slug}>
                {collection.name}
              </option>
            ))}
          </select>
        ) : null}

        {item.linkType === 'custom' ? (
          <LinkUrlInput value={item.url || ''} onChange={(url) => onUpdateItem(item.id, { url })} disabled={fieldsDisabled} />
        ) : null}

        {item.linkType === 'group' ? <span className={styles.groupHint}>No link — just a heading for its sub-items</span> : null}

        <div className={styles.menuItemActions}>
          <button type="button" onClick={() => onMoveItem(item.id, -1)} disabled={fieldsDisabled || !canMoveUp} title="Move up">
            <ChevronUp size={13} />
          </button>
          <button type="button" onClick={() => onMoveItem(item.id, 1)} disabled={fieldsDisabled || !canMoveDown} title="Move down">
            <ChevronDown size={13} />
          </button>
          <button type="button" onClick={() => onAddChild(item.id)} disabled={fieldsDisabled} title="Add sub-item">
            <Plus size={13} /> Sub-item
          </button>
          <button type="button" className={styles.removeButton} onClick={() => onRemoveItem(item.id)} disabled={fieldsDisabled} title="Remove">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {(item.children || []).map((child, childIndex) => (
        <MenuItemRow
          key={child.id}
          item={child}
          depth={depth + 1}
          siblings={item.children}
          index={childIndex}
          categories={categories}
          collections={collections}
          fieldsDisabled={fieldsDisabled}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
          onAddChild={onAddChild}
          onMoveItem={onMoveItem}
        />
      ))}
    </div>
  );
};

const emptyMenuForm = { name: '', status: 'ACTIVE', items: [] };

function MenusPage() {
  const { canEdit, isEditing, startEdit, stopEdit } = useEditGuard(PERMISSIONS.NAVIGATION_MANAGE);
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [form, setForm] = useState(emptyMenuForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const savedFormRef = useRef(emptyMenuForm);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [menusData, categoriesData, collectionsData] = await Promise.all([
        menusApi.list(),
        catalogApi.categories.list(),
        catalogApi.collections.list(),
      ]);
      setMenus(menusData.menus || []);
      setCategories(categoriesData.categories || []);
      setCollections((collectionsData.collections || []).filter((collection) => collection.status === 'ACTIVE'));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load menus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openMenu = (menu) => {
    const nextForm = { name: menu.name, status: menu.status, items: menu.items || [] };
    savedFormRef.current = nextForm;
    setForm(nextForm);
    setActiveMenuId(menu.id);
    setNotice('');
    setError('');
    stopEdit();
  };

  const startNewMenu = () => {
    const nextForm = { ...emptyMenuForm };
    savedFormRef.current = nextForm;
    setForm(nextForm);
    setActiveMenuId('new');
    setNotice('');
    setError('');
    startEdit();
  };

  const cancel = () => {
    if (activeMenuId === 'new') {
      setActiveMenuId(null);
    } else {
      setForm(savedFormRef.current);
    }
    setError('');
    stopEdit();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Menu name is required');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (activeMenuId === 'new') {
        const { menu } = await menusApi.create(form);
        setActiveMenuId(menu.id);
      } else {
        await menusApi.update(activeMenuId, form);
      }
      setNotice('Menu saved.');
      stopEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save menu');
    } finally {
      setSaving(false);
    }
  };

  const removeMenu = async (menu) => {
    if (!window.confirm(`Delete "${menu.name}"?`)) return;
    try {
      await menusApi.remove(menu.id);
      if (activeMenuId === menu.id) setActiveMenuId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete menu');
    }
  };

  const updateItem = (id, patch) => setForm((current) => ({ ...current, items: mapById(current.items, id, (item) => ({ ...item, ...patch })) }));
  const removeItem = (id) => setForm((current) => ({ ...current, items: removeById(current.items, id) }));
  const addChild = (parentId) => setForm((current) => ({ ...current, items: addChildById(current.items, parentId, newItem()) }));
  const moveItem = (id, direction) => setForm((current) => ({ ...current, items: moveSiblingById(current.items, id, direction) }));

  const fieldsDisabled = !isEditing;
  const activeMenu = menus.find((menu) => menu.id === activeMenuId);

  return (
    <section className={catalogStyles.page}>
      <PageHeader
        eyebrow="Settings / Storefront"
        icon={ListTree}
        title="Menus"
        description="Build nested navigation trees — Category, Collection, and custom links, grouped and nested however you like. The storefront can render a menu anywhere it chooses."
        actions={
          <Button type="button" onClick={startNewMenu} disabled={loading || !canEdit} title={!canEdit ? "You don't have permission to create menus" : undefined}>
            <Plus size={16} /> New menu
          </Button>
        }
      />

      {error ? <div className={catalogStyles.alert}>{error}</div> : null}
      {notice ? <div className={catalogStyles.notice}>{notice}</div> : null}

      {loading ? (
        <div className={catalogStyles.emptyState}>Loading...</div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.menuList}>
            {!menus.length ? <div className={catalogStyles.emptyState}>No menus yet.</div> : null}
            {menus.map((menu) => (
              <button
                type="button"
                key={menu.id}
                className={`${styles.menuListItem} ${activeMenuId === menu.id ? styles.menuListItemActive : ''}`}
                onClick={() => openMenu(menu)}
              >
                <span>
                  <strong>{menu.name}</strong>
                  <small>{menu.key}</small>
                </span>
                <Trash2
                  size={14}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeMenu(menu);
                  }}
                />
              </button>
            ))}
          </div>

          <div className={styles.editorPane}>
            {!activeMenuId ? (
              <div className={catalogStyles.emptyState}>Select a menu to edit, or create a new one.</div>
            ) : (
              <form className={catalogStyles.editor} onSubmit={submit}>
                <div className={catalogStyles.editorHeader}>
                  <div>
                    <span>{activeMenuId === 'new' ? 'New menu' : activeMenu?.key}</span>
                    <h2>{activeMenuId === 'new' ? 'Create menu' : form.name}</h2>
                  </div>
                  {!isEditing ? (
                    <Button type="button" onClick={startEdit} disabled={!canEdit}>
                      <Edit3 size={16} /> Edit
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? 'Saving' : 'Save'}
                      </Button>
                    </>
                  )}
                </div>

                <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
                  <div className={catalogStyles.twoCol}>
                    <label>
                      Name
                      <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label>
                      Status
                      <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.itemTree}>
                    {form.items.map((item, index) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        depth={0}
                        siblings={form.items}
                        index={index}
                        categories={categories}
                        collections={collections}
                        fieldsDisabled={fieldsDisabled}
                        onUpdateItem={updateItem}
                        onRemoveItem={removeItem}
                        onAddChild={addChild}
                        onMoveItem={moveItem}
                      />
                    ))}
                  </div>
                  <button type="button" className={styles.addTopLevel} onClick={() => addChild(null)} disabled={fieldsDisabled}>
                    <Plus size={14} /> Add top-level item
                  </button>
                </fieldset>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default MenusPage;
