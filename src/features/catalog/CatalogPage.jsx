import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  CornerDownRight,
  Edit3,
  FolderTree,
  GripVertical,
  LayoutGrid,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import ImageUploadField from '@components/forms/ImageUploadField/ImageUploadField';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import { usePermission } from '@hooks/usePermission';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { catalogApi } from './catalog.api';
import styles from './CatalogPage.module.scss';

const emptyForms = {
  categories: {
    name: '',
    parentId: '',
    image: '',
    shortDescription: '',
    status: 'ACTIVE',
    sortOrder: 0,
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
  },
  brands: {
    name: '',
    logo: '',
    websiteUrl: '',
    description: '',
    status: 'ACTIVE',
    isFeatured: false,
    sortOrder: 0,
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
  },
  attributes: {
    name: '',
    displayName: '',
    applicableTo: 'PRODUCT',
    sortOrder: 0,
  },
  collections: {
    name: '',
    type: 'PRODUCT',
    image: '',
    status: 'ACTIVE',
  },
  tags: {
    name: '',
  },
};

const moduleConfig = {
  categories: {
    title: 'Categories',
    singular: 'Category',
    eyebrow: 'E-Commerce',
    icon: FolderTree,
    subtitle: 'Build storefront hierarchy with images, SEO, ordering, and parent-child relationships.',
  },
  brands: {
    title: 'Brands',
    singular: 'Brand',
    eyebrow: 'E-Commerce',
    icon: Award,
    subtitle: 'Maintain brand identity, logos, featured flags, website links, and search metadata.',
  },
  attributes: {
    title: 'Attributes',
    singular: 'Attribute',
    eyebrow: 'E-Commerce',
    icon: SlidersHorizontal,
    subtitle: 'Manage global option masters and values used by product variation builders.',
  },
  collections: {
    title: 'Collections',
    singular: 'Collection',
    eyebrow: 'Storefront',
    icon: LayoutGrid,
    subtitle: 'Curate ordered product and category collections for storefront sections.',
  },
  tags: {
    title: 'Tags',
    singular: 'Tag',
    eyebrow: 'E-Commerce',
    icon: TagIcon,
    subtitle: 'Manage the reusable tag list products are labelled with.',
  },
};

const getItems = (module, data) => data?.[module] || data?.categories || data?.brands || data?.attributes || data?.collections || data?.tags || [];
const normalizeList = (value) => (Array.isArray(value) ? value : []);
const statusClass = (status) => (status === 'ACTIVE' ? styles.statusActive : status === 'DRAFT' ? styles.statusDraft : styles.statusInactive);

// Depth-first flatten of the parent/child category graph, sorted the same way within
// each level as the backend (sortOrder, then name) — turns a flat list into an ordered
// row list with a `depth` per row for indentation. Only meaningful when nothing is
// filtered out by search (a tree with orphaned-by-filter children reads as broken), so
// the caller falls back to a flat list once a search query is active.
const buildCategoryRows = (categories) => {
  const byParent = new Map();
  categories.forEach((category) => {
    const key = category.parentId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(category);
  });
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name)));
  }
  const rows = [];
  const walk = (parentId, depth) => {
    (byParent.get(parentId) || []).forEach((category) => {
      rows.push({ ...category, depth });
      walk(category.id, depth + 1);
    });
  };
  walk(null, 0);
  return rows;
};

const emptyCollectionDraft = { items: [], search: '', results: [], searching: false };

function CatalogPage({ module }) {
  const config = moduleConfig[module];
  const Icon = config.icon;
  const api = catalogApi[module];

  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.PRODUCT_CREATE);
  const { canEdit, isEditing, startEdit, stopEdit, setIsEditing } = useEditGuard(PERMISSIONS.PRODUCT_UPDATE);

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForms[module]);
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [valueDrafts, setValueDrafts] = useState({});
  const [collectionDraft, setCollectionDraft] = useState(emptyCollectionDraft);
  const valueInputRefs = useRef({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const text = [item.name, item.slug, item.displayName, item.description, item.websiteUrl, item.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  // Categories render as an indented tree when browsing (search empty) so parent/child
  // structure is visible at a glance; a search narrows to a flat, depth-0 match list —
  // indentation stops being meaningful once children are being filtered out from under
  // their parents.
  const displayRows = useMemo(() => {
    if (module === 'categories' && !search.trim()) return buildCategoryRows(filtered);
    return filtered.map((item) => ({ ...item, depth: 0 }));
  }, [module, filtered, search]);

  const categoryChildCounts = useMemo(() => {
    if (module !== 'categories') return {};
    return filtered.reduce((counts, item) => {
      if (item.parentId) counts[item.parentId] = (counts[item.parentId] || 0) + 1;
      return counts;
    }, {});
  }, [module, filtered]);

  // Tree-ordered, indented parent-category choices for the create/edit form — excludes
  // the category being edited and all of its descendants, so the dropdown can't offer a
  // selection the backend's circular-hierarchy check would reject anyway.
  const categoryParentOptions = useMemo(() => {
    if (module !== 'categories') return [];
    const excludedIds = new Set();
    if (editing) {
      excludedIds.add(editing.id);
      const collectDescendants = (parentId) => {
        items.forEach((item) => {
          if (item.parentId === parentId && !excludedIds.has(item.id)) {
            excludedIds.add(item.id);
            collectDescendants(item.id);
          }
        });
      };
      collectDescendants(editing.id);
    }
    return buildCategoryRows(items.filter((item) => !excludedIds.has(item.id)));
  }, [module, items, editing]);

  const metrics = useMemo(() => {
    // Tags have no status field — every fetched row is already "active" (soft-deleted
    // ones are excluded server-side), so the summary strip reads sensibly without a
    // dedicated tags branch downstream.
    const active = module === 'tags' ? items.length : items.filter((item) => item.status === 'ACTIVE').length;
    const inactive = module === 'tags' ? 0 : items.filter((item) => item.status === 'INACTIVE').length;
    const featured = items.filter((item) => item.isFeatured).length;
    const values = items.reduce((total, item) => total + (item.values?.length || 0), 0);
    return { total: items.length, active, inactive, featured, values };
  }, [items, module]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = module === 'categories'
        ? { flat: true }
        : module === 'attributes'
          ? { withValues: true }
          : { limit: 100 };
      const data = await api.list(params);
      setItems(getItems(module, data));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load ecommerce workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(emptyForms[module]);
    setEditing(null);
    setView('list');
    setSearch('');
    setStatusFilter('ALL');
    setValueDrafts({});
    setCollectionDraft(emptyCollectionDraft);
    load();
  }, [module]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const startCreate = () => {
    if (!canCreate) return;
    setForm(emptyForms[module]);
    setEditing(null);
    setIsEditing(true); // a blank new record has nothing to "view" — always editable
    setCollectionDraft(emptyCollectionDraft);
    setError('');
    setNotice('');
    setView('form');
  };

  const closeForm = () => {
    setView('list');
    setEditing(null);
    setForm(emptyForms[module]);
    setCollectionDraft(emptyCollectionDraft);
    stopEdit();
  };

  const editItem = async (item) => {
    setError('');
    setNotice('');
    setEditing(item);
    setForm({ ...emptyForms[module], ...item, parentId: item.parentId || '' });
    stopEdit(); // opens read-only — Edit must be clicked (and permitted) to unlock fields
    setView('form');
    if (module === 'collections') {
      try {
        const data = await catalogApi.collections.get(item.id);
        const collection = data.collection || item;
        setEditing(collection);
        setForm({ ...emptyForms.collections, ...collection });
        setCollectionDraft({ ...emptyCollectionDraft, items: normalizeList(collection.items) });
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to open collection');
      }
    }
  };

  const cancelEdit = () => {
    if (editing) editItem(editing);
    else closeForm();
  };

  const normalizePayload = () => {
    if (module === 'categories') {
      return {
        ...form,
        parentId: form.parentId || null,
        image: form.image || null,
        ogImage: form.ogImage || form.image || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
    }
    if (module === 'brands') {
      return {
        ...form,
        logo: form.logo || null,
        ogImage: form.ogImage || form.logo || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
    }
    if (module === 'attributes') {
      return { ...form, sortOrder: Number(form.sortOrder) || 0 };
    }
    if (module === 'collections') {
      return { ...form, image: form.image || null };
    }
    return form;
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = normalizePayload();
      const saved = editing ? await api.update(editing.id, payload) : await api.create(payload);
      const savedCollection = saved.collection || editing;
      if (module === 'collections' && savedCollection?.id && (editing || collectionDraft.items.length)) {
        await catalogApi.collections.setItems(savedCollection.id, {
          items: collectionDraft.items.map((item, index) => ({ itemId: item.id, sortOrder: index })),
        });
      }
      setNotice(`${config.singular} ${editing ? 'updated' : 'created'}.`);
      closeForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event, item) => {
    event.stopPropagation();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.remove(item.id);
      setNotice(`${config.singular} deleted.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete');
    } finally {
      setSaving(false);
    }
  };

  const stageAttributeValues = (attributeId, raw) => {
    const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
    setValueDrafts((current) => ({ ...current, [attributeId]: [...new Set([...(current[attributeId] || []), ...values])] }));
  };

  const createAttributeValues = async (attribute) => {
    const inputEl = valueInputRefs.current[attribute.id];
    const pending = inputEl?.value.split(',').map((value) => value.trim()).filter(Boolean) || [];
    const values = [...new Set([...(valueDrafts[attribute.id] || []), ...pending])];
    if (!values.length) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all(values.map((value) => catalogApi.attributes.createValue(attribute.id, { value, displayValue: value })));
      setValueDrafts((current) => ({ ...current, [attribute.id]: [] }));
      if (inputEl) inputEl.value = '';
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save values');
    } finally {
      setSaving(false);
    }
  };

  const removeAttributeValue = async (valueId) => {
    setSaving(true);
    setError('');
    try {
      await catalogApi.attributes.removeValue(valueId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to remove value');
    } finally {
      setSaving(false);
    }
  };

  const searchCollectionItems = async () => {
    if (module !== 'collections') return;
    setCollectionDraft((current) => ({ ...current, searching: true }));
    try {
      const data = await catalogApi.collections.searchItems({
        type: form.type,
        q: collectionDraft.search,
        excludeIds: collectionDraft.items.map((item) => item.id).join(','),
        limit: 24,
      });
      setCollectionDraft((current) => ({ ...current, results: data.items || [], searching: false }));
    } catch (err) {
      setCollectionDraft((current) => ({ ...current, searching: false }));
      setError(err.response?.data?.message || err.message || 'Unable to search collection items');
    }
  };

  // Live search: re-queries 300ms after the query or collection type settles, so the
  // result grid behaves like a dropdown instead of requiring the explicit Search button.
  // Also fires on entry (empty query) so items are visible before the user types anything.
  useEffect(() => {
    if (module !== 'collections' || view !== 'form') return;
    const timeout = setTimeout(() => {
      searchCollectionItems();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, view, form.type, collectionDraft.search]);

  const addCollectionItem = (item) => {
    setCollectionDraft((current) => ({
      ...current,
      items: current.items.some((existing) => Number(existing.id) === Number(item.id)) ? current.items : [...current.items, item],
      results: current.results.filter((result) => Number(result.id) !== Number(item.id)),
    }));
  };

  const moveCollectionItem = (from, to) => {
    setCollectionDraft((current) => {
      if (to < 0 || to >= current.items.length) return current;
      const items = [...current.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...current, items };
    });
  };

  const removeCollectionItem = (id) => {
    setCollectionDraft((current) => ({ ...current, items: current.items.filter((item) => Number(item.id) !== Number(id)) }));
  };

  const renderForm = () => {
    const fieldsDisabled = editing ? !isEditing : false;
    return (
    <form className={styles.editor} onSubmit={submit}>
      <div className={styles.editorHeader}>
        <div>
          <span>{editing ? (isEditing ? 'Editing' : 'Viewing') : 'Creating'}</span>
          <h2>{editing ? editing.name : `New ${config.singular}`}</h2>
        </div>
        <div className={styles.editorHeaderActions}>
          {editing && !isEditing ? (
            <Button type="button" onClick={startEdit} disabled={!canEdit} title={!canEdit ? `You don't have permission to edit ${config.title.toLowerCase()}` : undefined}>
              <Edit3 size={16} /> Edit
            </Button>
          ) : null}
          <button type="button" onClick={closeForm}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {editing && !canEdit ? <div className={styles.notice}>You have read-only access to {config.title.toLowerCase()}.</div> : null}

      <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
      <section className={styles.editorSection}>
        <h3>Core Details</h3>
        <label>Name<input value={form.name || ''} onChange={(event) => updateField('name', event.target.value)} required /></label>
        {module === 'attributes' ? <label>Display Name<input value={form.displayName || ''} onChange={(event) => updateField('displayName', event.target.value)} /></label> : null}

        {module === 'categories' ? (
          <>
            <div className={styles.twoCol}>
              <label>
                Parent Category
                <select value={form.parentId || ''} onChange={(event) => updateField('parentId', event.target.value)}>
                  <option value="">Root category</option>
                  {categoryParentOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.depth ? `${'—'.repeat(category.depth)} ` : ''}{category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Sort Order<input type="number" value={form.sortOrder ?? 0} onChange={(event) => updateField('sortOrder', event.target.value)} /></label>
            </div>
            <ImageUploadField label="Category Image" value={form.image} onChange={(url) => updateField('image', url)} folder="categories" />
            <label>Short Description<textarea value={form.shortDescription || ''} onChange={(event) => updateField('shortDescription', event.target.value)} rows={3} /></label>
          </>
        ) : null}

        {module === 'brands' ? (
          <>
            <div className={styles.twoCol}>
              <ImageUploadField label="Logo" value={form.logo} onChange={(url) => updateField('logo', url)} folder="brands" />
              <label>Website URL<input value={form.websiteUrl || ''} onChange={(event) => updateField('websiteUrl', event.target.value)} /></label>
            </div>
            <label>Description<textarea value={form.description || ''} onChange={(event) => updateField('description', event.target.value)} rows={4} /></label>
            <label className={styles.inlineCheck}><input type="checkbox" checked={Boolean(form.isFeatured)} onChange={(event) => updateField('isFeatured', event.target.checked)} /> Featured brand</label>
          </>
        ) : null}

        {module === 'attributes' ? (
          <div className={styles.twoCol}>
            <label>Sort Order<input type="number" value={form.sortOrder ?? 0} onChange={(event) => updateField('sortOrder', event.target.value)} /></label>
          </div>
        ) : null}

        {module === 'collections' ? (
          <>
            <div className={styles.twoCol}>
              <label>
                Collection Type
                <select value={form.type || 'PRODUCT'} onChange={(event) => updateField('type', event.target.value)} disabled={Boolean(editing)}>
                  <option value="PRODUCT">Products</option>
                  <option value="CATEGORY">Categories</option>
                </select>
              </label>
              <label>
                Status
                <select value={form.status || 'ACTIVE'} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <ImageUploadField label="Collection Image" value={form.image} onChange={(url) => updateField('image', url)} folder="collections" />
          </>
        ) : null}

        {module !== 'attributes' && module !== 'collections' && module !== 'tags' ? (
          <div className={styles.twoCol}>
            <label>
              Status
              <select value={form.status || 'ACTIVE'} onChange={(event) => updateField('status', event.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            {module === 'brands' ? <label>Sort Order<input type="number" value={form.sortOrder ?? 0} onChange={(event) => updateField('sortOrder', event.target.value)} /></label> : null}
          </div>
        ) : null}
      </section>

      {['categories', 'brands'].includes(module) ? (
        <section className={styles.editorSection}>
          <h3>SEO & Sharing</h3>
          <div className={styles.twoCol}>
            <label>Meta Title<input value={form.metaTitle || ''} onChange={(event) => updateField('metaTitle', event.target.value)} /></label>
            <ImageUploadField label="OG Image" value={form.ogImage} onChange={(url) => updateField('ogImage', url)} folder={module} />
          </div>
          <label>Meta Description<textarea value={form.metaDescription || ''} onChange={(event) => updateField('metaDescription', event.target.value)} rows={3} /></label>
        </section>
      ) : null}

      {module === 'collections' ? (
        <section className={styles.editorSection}>
          <h3>Collection Items</h3>
          <div className={styles.collectionSearch}>
            <div className={styles.searchBox}>
              <Search size={16} />
              <input
                value={collectionDraft.search}
                onChange={(event) => setCollectionDraft((current) => ({ ...current, search: event.target.value }))}
                placeholder={`Search ${form.type === 'CATEGORY' ? 'categories' : 'products'}`}
              />
            </div>
            <button type="button" onClick={searchCollectionItems} disabled={collectionDraft.searching}>
              <Search size={16} /> Search
            </button>
          </div>
          {collectionDraft.searching ? (
            <div className={styles.emptyState}>Searching...</div>
          ) : collectionDraft.results.length ? (
            <div className={styles.resultGrid}>
              {collectionDraft.results.map((result) => (
                <button key={result.id} type="button" onClick={() => addCollectionItem(result)}>
                  <span>{result.image ? <img src={result.image} alt="" /> : <Plus size={16} />}</span>
                  <strong>{result.name}</strong>
                  <small>{result.subtitle || result.slug}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              {collectionDraft.search.trim() ? `No ${form.type === 'CATEGORY' ? 'categories' : 'products'} matched "${collectionDraft.search.trim()}".` : `No ${form.type === 'CATEGORY' ? 'categories' : 'products'} available to add.`}
            </div>
          )}
          <div className={styles.selectedItems}>
            {collectionDraft.items.length ? collectionDraft.items.map((item, index) => (
              <article key={item.id}>
                <GripVertical size={15} />
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <small>{item.subtitle || item.slug}</small>
                <button type="button" onClick={() => moveCollectionItem(index, index - 1)}>Up</button>
                <button type="button" onClick={() => moveCollectionItem(index, index + 1)}>Down</button>
                <button type="button" onClick={() => removeCollectionItem(item.id)}><X size={14} /></button>
              </article>
            )) : <div className={styles.emptyState}>Search and add items to curate this collection.</div>}
          </div>
        </section>
      ) : null}
      </fieldset>

      {/* Edit lives in the header now (next to Close) so it's visible without scrolling past
          every section first — see editorHeaderActions above. Only Cancel/Save belong down
          here, and only once there's actually something to submit. */}
      {!(editing && !isEditing) ? (
        <div className={styles.formActions}>
          {editing ? <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button> : null}
          <button className={styles.primaryButton} type="submit" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving' : editing ? 'Save Changes' : `Create ${config.singular}`}
          </button>
        </div>
      ) : null}
    </form>
    );
  };

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow={`Catalog / ${config.title}`}
        icon={Icon}
        title={config.title}
        description={config.subtitle}
        meta={`${filtered.length} visible`}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>
            <Button type="button" onClick={startCreate} disabled={!canCreate} title={!canCreate ? `You don't have permission to create ${config.title.toLowerCase()}` : undefined}>
              <Plus size={16} /> New {config.singular}
            </Button>
          </>
        )}
      />

      {error ? <div className={styles.alert}>{error}</div> : null}
      {notice ? <div className={styles.notice}>{notice}</div> : null}

      {view === 'form' ? renderForm() : (
        <main className={styles.listShell}>
          <section className={styles.summary}>
            <div><span>Total</span><strong>{metrics.total}</strong></div>
            <div><span>Active</span><strong>{metrics.active}</strong></div>
            <div><span>{module === 'attributes' ? 'Values' : module === 'brands' ? 'Featured' : 'Inactive'}</span><strong>{module === 'attributes' ? metrics.values : module === 'brands' ? metrics.featured : metrics.inactive}</strong></div>
            <div><span>Visible List</span><strong>{filtered.length}</strong></div>
          </section>

          <section className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} />
            </div>
            {module === 'attributes' || module === 'tags' ? null : (
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            )}
          </section>

          {module === 'categories' ? (
            <section className={styles.categoryTable}>
              <div className={styles.categoryTableHead}>
                <span>Category</span>
                <span>Handle</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {loading ? <div className={styles.emptyState}>Loading...</div> : null}
              {!loading && !displayRows.length ? <div className={styles.emptyState}>No records found.</div> : null}
              {displayRows.map((item) => {
                const childCount = categoryChildCounts[item.id] || 0;
                return (
                  <article
                    key={item.id}
                    className={styles.categoryTableRow}
                    data-depth={item.depth || 0}
                    style={{ '--category-indent': `${(item.depth || 0) * 24}px` }}
                    onClick={() => editItem(item)}
                  >
                    <div className={styles.categoryNameCell}>
                      <span className={styles.categoryBranch}>
                        {item.depth ? <CornerDownRight size={14} /> : null}
                      </span>
                      <span className={styles.categoryThumb}>
                        {item.image ? <img src={item.image} alt="" /> : <Icon size={18} />}
                      </span>
                      <span className={styles.categoryText}>
                        <strong title={item.name}>{item.name}</strong>
                        <small>
                          {item.depth
                            ? `Child category${item.parent?.name ? ` of ${item.parent.name}` : ''}`
                            : `${childCount} ${childCount === 1 ? 'child category' : 'child categories'}`}
                        </small>
                      </span>
                    </div>
                    <span className={styles.categoryHandle}>{item.slug ? `/${item.slug}` : 'No handle'}</span>
                    <mark className={`${styles.status} ${statusClass(item.status)}`}>{item.status}</mark>
                    <div className={styles.categoryActions} onClick={(event) => event.stopPropagation()}>
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={() => editItem(item)}><Edit3 size={15} /></button>
                      <button type="button" aria-label={`Delete ${item.name}`} onClick={(event) => remove(event, item)}><Trash2 size={15} /></button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className={styles.cardList}>
              {loading ? <div className={styles.emptyState}>Loading...</div> : null}
              {!loading && !displayRows.length ? <div className={styles.emptyState}>No records found.</div> : null}
              {displayRows.map((item) => {
                return (
                  <article
                    key={item.id}
                    className={styles.recordCard}
                    style={item.depth ? { marginLeft: `${item.depth * 28}px`, width: `calc(100% - ${item.depth * 28}px)` } : undefined}
                    onClick={() => editItem(item)}
                  >
                    <div className={styles.recordMedia}>
                      {item.logo || item.image ? <img src={item.logo || item.image} alt="" /> : <Icon size={20} />}
                    </div>
                    <div className={styles.recordMain}>
                      <div className={styles.recordTitle}>
                        <strong>
                          {item.depth ? <CornerDownRight size={13} className={styles.treeConnector} /> : null}
                          {item.displayName || item.name}
                        </strong>
                        {module === 'attributes' || module === 'tags' ? null : (
                          <mark className={`${styles.status} ${statusClass(item.status)}`}>{item.status}</mark>
                        )}
                      </div>
                      {module === 'tags' ? null : (
                        <p>{item.slug || item.websiteUrl || item.parent?.name || item.type || `${item.values?.length || 0} values`}</p>
                      )}
                      {module === 'attributes' && item.values?.length ? (
                        <div className={styles.valueChips}>
                          {item.values.slice(0, 10).map((value) => (
                            <span key={value.id}>
                              {value.displayValue || value.value}
                              <button type="button" onClick={(event) => { event.stopPropagation(); removeAttributeValue(value.id); }}><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {module === 'attributes' ? (
                        <div className={styles.valueBatch} onClick={(event) => event.stopPropagation()}>
                          <input
                            placeholder="red, blue, green"
                            ref={(el) => { valueInputRefs.current[item.id] = el; }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                stageAttributeValues(item.id, event.currentTarget.value);
                                event.currentTarget.value = '';
                              }
                            }}
                          />
                          {(valueDrafts[item.id] || []).map((value) => <em key={value}>{value}</em>)}
                          <button type="button" onClick={() => createAttributeValues(item)}><Plus size={14} /> Add Values</button>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.recordActions} onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => editItem(item)}><Edit3 size={16} /></button>
                      <button type="button" onClick={(event) => remove(event, item)}><Trash2 size={16} /></button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>
      )}
    </section>
  );
}

export default CatalogPage;
