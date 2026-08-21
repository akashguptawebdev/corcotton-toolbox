import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit3, Menu as MenuIcon, GripVertical } from 'lucide-react';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Button from '@components/ui/Button/Button';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { catalogApi } from '@features/catalog/catalog.api';
import { menusApi } from './menus.api';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './NavigationPage.module.scss';

const MENU_ITEM_TYPES = [
  { value: 'CATEGORY', label: 'Category' },
  { value: 'COLLECTION', label: 'Collection' },
  { value: 'URL', label: 'Custom URL' },
  { value: 'PAGE', label: 'Page' },
];

const genId = () => `nav-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const newNavItem = () => ({ id: genId(), type: 'CATEGORY', label: '', categoryId: null, collectionId: null, url: '', page: '', sortOrder: 0, isVisible: true });

const emptyNavigationForm = { name: 'Header Navigation', key: 'header-navigation', location: 'HEADER', status: 'ACTIVE', items: [] };

function NavigationPage() {
  const { canEdit, isEditing, startEdit, stopEdit } = useEditGuard(PERMISSIONS.NAVIGATION_VIEW);
  const [navigation, setNavigation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [form, setForm] = useState(emptyNavigationForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [menusData, categoriesData, collectionsData] = await Promise.all([
        menusApi.list(),
        catalogApi.categories.list(),
        catalogApi.collections.list(),
      ]);
      
      // Find header navigation menu
      const headerNav = menusData.menus?.find(m => m.key === 'header-navigation');
      if (headerNav) {
        setNavigation(headerNav);
        setForm({
          name: headerNav.name,
          key: headerNav.key,
          location: headerNav.location || 'HEADER',
          status: headerNav.status,
          items: headerNav.items || []
        });
      } else {
        setForm(emptyNavigationForm);
      }
      
      setCategories(categoriesData.categories || []);
      setCollections((collectionsData.collections || []).filter((collection) => collection.status === 'ACTIVE'));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load navigation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = () => {
    if (navigation) {
      setForm({
        name: navigation.name,
        key: navigation.key,
        location: navigation.location || 'HEADER',
        status: navigation.status,
        items: navigation.items || []
      });
    } else {
      setForm(emptyNavigationForm);
    }
    setError('');
    stopEdit();
  };

  const handleStartEdit = () => {
    setNotice('');
    setError('');
    startEdit();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Navigation name is required');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (navigation) {
        await menusApi.update(navigation.id, form);
      } else {
        const { menu } = await menusApi.create(form);
        setNavigation(menu);
      }
      setNotice('Navigation saved successfully.');
      stopEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save navigation');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (id, patch) => {
    setForm(current => ({
      ...current,
      items: current.items.map(item => 
        item.id === id ? { ...item, ...patch } : item
      )
    }));
  };

  const addItem = () => {
    const maxSortOrder = Math.max(...form.items.map(item => item.sortOrder || 0), -1);
    const newItemWithOrder = { ...newNavItem(), sortOrder: maxSortOrder + 1 };
    setForm(current => ({
      ...current,
      items: [...current.items, newItemWithOrder]
    }));
  };

  const removeItem = (id) => {
    setForm(current => ({
      ...current,
      items: current.items.filter(item => item.id !== id)
    }));
  };

  const moveItem = (index, direction) => {
    const items = [...form.items];
    if (direction === -1 && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 1 && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    
    // Update sort orders
    items.forEach((item, idx) => {
      item.sortOrder = idx;
    });
    
    setForm(current => ({ ...current, items }));
  };

  const fieldsDisabled = !isEditing;

  return (
    <section className={catalogStyles.page}>
      <PageHeader
        eyebrow="Storefront / Navigation"
        icon={MenuIcon}
        title="Header Navigation"
        description="Manage the main navigation menu that appears in the header. Add categories, collections, custom links, and reorder items."
        actions={
          !isEditing ? (
            <Button type="button" onClick={handleStartEdit} disabled={loading || !canEdit} title={!canEdit ? "You don't have permission to edit navigation" : undefined}>
              <Edit3 size={16} /> Edit
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" onClick={submit} disabled={saving}>
                {saving ? 'Saving' : 'Save'}
              </Button>
            </>
          )
        }
      />

      {error ? <div className={catalogStyles.alert}>{error}</div> : null}
      {notice ? <div className={catalogStyles.notice}>{notice}</div> : null}

      {loading ? (
        <div className={catalogStyles.emptyState}>Loading navigation...</div>
      ) : (
        <form className={catalogStyles.editor} onSubmit={submit}>
          <div className={catalogStyles.editorHeader}>
            <div>
              <span>{form.key}</span>
              <h2>{form.name}</h2>
            </div>
          </div>

          <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
            <div className={catalogStyles.twoCol}>
              <label>
                Name
                <input value={form.name} onChange={(event) => setForm(current => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(event) => setForm(current => ({ ...current, status: event.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>

            <div className={styles.navigationItems}>
              <div className={styles.itemsHeader}>
                <h3>Navigation Items</h3>
                {isEditing && (
                  <Button type="button" onClick={addItem} disabled={saving}>
                    <Plus size={14} /> Add Menu Item
                  </Button>
                )}
              </div>

              {form.items.length === 0 ? (
                <div className={catalogStyles.emptyState}>No navigation items yet. Add your first menu item to get started.</div>
              ) : (
                <div className={styles.itemsList}>
                  {form.items.map((item, index) => (
                    <div key={item.id} className={styles.navigationItem}>
                      <div className={styles.itemHandle}>
                        <GripVertical size={16} />
                      </div>
                      
                      <div className={styles.itemContent}>
                        <div className={styles.itemMain}>
                          <input
                            placeholder="Label"
                            value={item.label}
                            onChange={(e) => updateItem(item.id, { label: e.target.value })}
                            disabled={fieldsDisabled}
                            className={styles.labelInput}
                          />
                          
                          <select 
                            value={item.type} 
                            onChange={(e) => updateItem(item.id, { type: e.target.value })}
                            disabled={fieldsDisabled}
                            className={styles.typeSelect}
                          >
                            {MENU_ITEM_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>

                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={item.isVisible}
                              onChange={(e) => updateItem(item.id, { isVisible: e.target.checked })}
                              disabled={fieldsDisabled}
                            />
                            Visible
                          </label>
                        </div>

                        <div className={styles.itemDetails}>
                          {item.type === 'CATEGORY' && (
                            <select 
                              value={item.categoryId || ''} 
                              onChange={(e) => updateItem(item.id, { categoryId: e.target.value ? parseInt(e.target.value) : null })}
                              disabled={fieldsDisabled}
                            >
                              <option value="">Select category</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {item.type === 'COLLECTION' && (
                            <select 
                              value={item.collectionId || ''} 
                              onChange={(e) => updateItem(item.id, { collectionId: e.target.value ? parseInt(e.target.value) : null })}
                              disabled={fieldsDisabled}
                            >
                              <option value="">Select collection</option>
                              {collections.map(col => (
                                <option key={col.id} value={col.id}>
                                  {col.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {item.type === 'URL' && (
                            <input
                              type="url"
                              placeholder="https://example.com"
                              value={item.url || ''}
                              onChange={(e) => updateItem(item.id, { url: e.target.value })}
                              disabled={fieldsDisabled}
                            />
                          )}

                          {item.type === 'PAGE' && (
                            <input
                              placeholder="Page name"
                              value={item.page || ''}
                              onChange={(e) => updateItem(item.id, { page: e.target.value })}
                              disabled={fieldsDisabled}
                            />
                          )}
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        <button 
                          type="button" 
                          onClick={() => moveItem(index, -1)} 
                          disabled={fieldsDisabled || index === 0}
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveItem(index, 1)} 
                          disabled={fieldsDisabled || index === form.items.length - 1}
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button 
                          type="button" 
                          className={styles.removeButton} 
                          onClick={() => removeItem(item.id)} 
                          disabled={fieldsDisabled}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}

export default NavigationPage;