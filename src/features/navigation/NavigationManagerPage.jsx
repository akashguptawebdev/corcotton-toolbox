import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Menu as MenuIcon, Edit3, Plus, Trash2, ChevronUp, ChevronDown,
  Eye, EyeOff, GripVertical, AlertCircle,
} from 'lucide-react';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Button from '@components/ui/Button/Button';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { catalogApi } from '@features/catalog/catalog.api';
import { menusApi, megaMenuConfigApi } from './navigation.api';
import ImageField from './ImageField';
import LinkTargetField from './LinkTargetField';
import CategoryMultiSelect from './CategoryMultiSelect';
import CollapsibleSection from './CollapsibleSection';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './NavigationManagerPage.module.scss';

// Quick-pick backgrounds for the promotional card while real photography is pending —
// matches the gradients the storefront seed data already ships with.
const GRADIENT_PRESETS = [
  'linear-gradient(160deg, #2c2c2c, #050505)',
  'linear-gradient(to bottom, #ECE9E4, #D8D3CB)',
  'linear-gradient(to bottom, #E7E3DC, #D2CCC1)',
  'linear-gradient(to bottom, #DEDAD2, #C6BFB2)',
  'linear-gradient(to bottom right, #2a2a2a, #0d0d0d)',
  'linear-gradient(135deg, #6c5ce7, #4a3aa7)',
];

const MENU_KEY = 'header-navigation';

const ITEM_TYPES = [
  { value: 'CATEGORY', label: 'Category' },
  { value: 'COLLECTION', label: 'Collection' },
  { value: 'URL', label: 'Custom URL' },
  { value: 'PAGE', label: 'Page' },
];

const LAYOUT_TYPES = ['STANDARD', 'WIDE', 'COMPACT'];

const genId = () => `nav-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const newItem = (sortOrder) => ({
  id: genId(),
  type: 'CATEGORY',
  label: '',
  categoryId: null,
  collectionId: null,
  url: '',
  page: '',
  sortOrder,
  isVisible: true,
});

const blankConfig = (menuId, menuItemId, categoryId) => ({
  menuId,
  menuItemId,
  categoryId: categoryId ?? null,
  menuTitle: '',
  menuDescription: '',
  shopTitle: '',
  promotionalTitle: '',
  promotionalDescription: '',
  promotionalButtonText: '',
  promotionalLink: '',
  promotionalImage: '',
  promotionalGradient: 'linear-gradient(160deg, #2c2c2c, #050505)',
  showChildren: true,
  showFeaturedCategories: true,
  featuredCategoryIds: [],
  showFits: false,
  fitsTitle: '',
  fits: [],
  fitsViewAllLabel: '',
  fitsViewAllPath: '',
  layoutType: 'STANDARD',
  columns: 3,
  status: 'ACTIVE',
  sortOrder: 0,
});

const errorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join(' · ');
  return data?.message || err?.message || fallback;
};

/**
 * Single screen for the storefront header: the nav items themselves (order, labels, link
 * targets) on the left, and the mega-menu panel behind the selected item on the right.
 *
 * These were two pages; they are merged because a nav item and its dropdown are one unit of
 * work — you almost never edit one without looking at the other, and the split meant a new
 * item had to be saved on one page before it could be configured on the other.
 *
 * Saving is atomic from the user's point of view: one Save writes the menu tree and every
 * mega-menu panel touched in this session.
 */
function NavigationManagerPage() {
  const { canEdit, isEditing, startEdit, stopEdit } = useEditGuard(PERMISSIONS.NAVIGATION_MANAGE);

  const [menu, setMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);

  // menuItemId -> edited panel. Populated lazily so an untouched item is never rewritten.
  const [drafts, setDrafts] = useState({});
  // menuItemIds whose panel should be deleted on save (mega menu switched off).
  const removedConfigs = useRef(new Set());

  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('link');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [menusData, categoriesData, collectionsData] = await Promise.all([
        menusApi.list({ location: 'HEADER' }),
        catalogApi.categories.list(),
        catalogApi.collections.list(),
      ]);

      const headerMenu = (menusData.menus || []).find((m) => m.key === MENU_KEY) || null;
      setMenu(headerMenu);
      setCategories(categoriesData.categories || []);
      setCollections((collectionsData.collections || []).filter((c) => c.status === 'ACTIVE'));

      const loadedItems = [...(headerMenu?.items || [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
      setItems(loadedItems);
      setSelectedId((current) => (loadedItems.some((i) => i.id === current) ? current : loadedItems[0]?.id ?? null));

      if (headerMenu) {
        const { configs: rows } = await megaMenuConfigApi.list({ menuId: headerMenu.id });
        setConfigs(rows || []);
      }
      setDrafts({});
      removedConfigs.current = new Set();
    } catch (err) {
      setError(errorMessage(err, 'Unable to load navigation'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = items.find((i) => i.id === selectedId) || null;
  const savedConfig = configs.find((c) => c.menuItemId === selectedId) || null;
  const draft = drafts[selectedId] ?? null;

  // A panel is "on" if it has an unsaved draft, or a saved row that is not pending removal.
  const megaEnabled = draft
    ? true
    : Boolean(savedConfig) && !removedConfigs.current.has(selectedId);

  const activeConfig = draft ?? savedConfig ?? null;

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [Number(c.id), c])),
    [categories]
  );

  const rootCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const childCategories = useMemo(
    () => categories.filter((c) => Number(c.parentId) === Number(activeConfig?.categoryId)),
    [categories, activeConfig?.categoryId]
  );

  // ---- nav item mutations -------------------------------------------------

  const patchItem = (id, patch) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addItem = () => {
    const item = newItem(items.length);
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
    setTab('link');
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((i) => i.id !== id).map((i, idx) => ({ ...i, sortOrder: idx })));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (configs.some((c) => c.menuItemId === id)) removedConfigs.current.add(id);
    if (selectedId === id) setSelectedId(items.find((i) => i.id !== id)?.id ?? null);
  };

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next.map((item, idx) => ({ ...item, sortOrder: idx })));
  };

  // ---- mega menu mutations ------------------------------------------------

  const patchConfig = (patch) =>
    setDrafts((current) => ({
      ...current,
      [selectedId]: { ...(current[selectedId] ?? savedConfig ?? blankConfig(menu.id, selectedId, selected?.categoryId)), ...patch },
    }));

  const toggleMega = (enabled) => {
    if (enabled) {
      removedConfigs.current.delete(selectedId);
      setDrafts((current) => ({
        ...current,
        [selectedId]: current[selectedId] ?? savedConfig ?? blankConfig(menu.id, selectedId, selected?.categoryId),
      }));
    } else {
      if (savedConfig) removedConfigs.current.add(selectedId);
      setDrafts((current) => {
        const next = { ...current };
        delete next[selectedId];
        return next;
      });
    }
  };

  const toggleFeatured = (categoryId) => {
    const ids = activeConfig?.featuredCategoryIds || [];
    patchConfig({
      featuredCategoryIds: ids.includes(categoryId) ? ids.filter((id) => id !== categoryId) : [...ids, categoryId],
    });
  };

  const patchFit = (index, patch) =>
    patchConfig({ fits: (activeConfig.fits || []).map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  const addFit = () => patchConfig({ fits: [...(activeConfig.fits || []), { label: '', path: '' }] });
  const removeFit = (index) => patchConfig({ fits: activeConfig.fits.filter((_, i) => i !== index) });

  // ---- persistence --------------------------------------------------------

  const cancel = () => {
    stopEdit();
    setError('');
    load();
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      // The menu goes first: a panel references its item by id, so the item must exist
      // server-side before its config is written.
      const payloadItems = items.map((item, index) => ({ ...item, sortOrder: index }));
      let menuId = menu?.id;

      if (menuId) {
        await menusApi.update(menuId, { name: menu.name, location: 'HEADER', status: menu.status, items: payloadItems });
      } else {
        const created = await menusApi.create({
          name: 'Header Navigation',
          key: MENU_KEY,
          location: 'HEADER',
          status: 'ACTIVE',
          items: payloadItems,
        });
        menuId = created.menu.id;
      }

      for (const menuItemId of removedConfigs.current) {
        const existing = configs.find((c) => c.menuItemId === menuItemId);
        if (existing) await megaMenuConfigApi.remove(existing.id);
      }

      for (const [menuItemId, config] of Object.entries(drafts)) {
        const existing = configs.find((c) => c.menuItemId === menuItemId);
        const payload = { ...config, menuId, menuItemId };
        if (existing) await megaMenuConfigApi.update(existing.id, payload);
        else await megaMenuConfigApi.create(payload);
      }

      setNotice('Navigation saved. The storefront will pick it up on next load.');
      stopEdit();
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Unable to save navigation'));
    } finally {
      setSaving(false);
    }
  };

  const disabled = !isEditing;

  const targetSummary = (item) => {
    if (item.type === 'CATEGORY') return categoryById.get(Number(item.categoryId))?.name || 'No category';
    if (item.type === 'COLLECTION') return collections.find((c) => Number(c.id) === Number(item.collectionId))?.name || 'No collection';
    if (item.type === 'URL') return item.url || 'No URL';
    return item.page || 'No page';
  };

  const itemIsIncomplete = (item) =>
    !item.label?.trim() ||
    (item.type === 'CATEGORY' && !item.categoryId) ||
    (item.type === 'COLLECTION' && !item.collectionId) ||
    (item.type === 'URL' && !item.url?.trim()) ||
    (item.type === 'PAGE' && !item.page?.trim());

  // An item can be fully filled in and still never appear on the storefront: the backend
  // only resolves ACTIVE categories/collections (navigation.service.js), and silently drops
  // any item whose reference doesn't resolve — no error anywhere. This is exactly what
  // happened with "Women": the category existed, the item pointed at it correctly, it just
  // wasn't active. Surface that here instead of letting it fail invisibly again.
  const itemTargetInactive = (item) => {
    if (item.type === 'CATEGORY' && item.categoryId) return categoryById.get(Number(item.categoryId))?.status !== 'ACTIVE';
    if (item.type === 'COLLECTION' && item.collectionId) return !collections.some((c) => Number(c.id) === Number(item.collectionId));
    return false;
  };

  const itemWarning = (item) => {
    if (itemIsIncomplete(item)) return 'This item is missing a required field.';
    if (itemTargetInactive(item)) return "This item's target is inactive or no longer exists — it will not appear on the storefront.";
    return null;
  };

  const categoryOptionLabel = (category) => (category.status !== 'ACTIVE' ? `${category.name} — Inactive` : category.name);

  return (
    <section className={catalogStyles.page}>
      <PageHeader
        eyebrow="Storefront / Navigation"
        icon={MenuIcon}
        title="Navigation & Mega Menus"
        description="Build the storefront header: order the top-level items, point them at a category, collection, page or URL, and design the dropdown behind each one."
        actions={
          !isEditing ? (
            <Button
              type="button"
              onClick={startEdit}
              disabled={loading || !canEdit}
              title={!canEdit ? "You don't have permission to edit navigation" : undefined}
            >
              <Edit3 size={16} /> Edit
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>Cancel</Button>
              <Button type="button" onClick={save} loading={saving}>{saving ? 'Saving' : 'Save changes'}</Button>
            </>
          )
        }
      />

      {error ? <div className={catalogStyles.alert}>{error}</div> : null}
      {notice ? <div className={catalogStyles.notice}>{notice}</div> : null}

      {loading ? (
        <div className={catalogStyles.emptyState}>Loading navigation…</div>
      ) : (
        <div className={styles.layout}>
          {/* ---------------- LEFT: the nav tree ---------------- */}
          <aside className={styles.rail}>
            <header className={styles.railHead}>
              <span>Header items</span>
              <em>{items.length}</em>
            </header>

            <ul className={styles.railList}>
              {items.map((item, index) => {
                const hasMega = drafts[item.id] || (configs.some((c) => c.menuItemId === item.id) && !removedConfigs.current.has(item.id));
                const warning = itemWarning(item);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={[styles.railItem, item.id === selectedId ? styles.railItemActive : ''].join(' ')}
                    >
                      <GripVertical size={14} className={styles.railGrip} />
                      <span className={styles.railBody}>
                        <span className={styles.railLabel}>
                          {item.label?.trim() || <em>Untitled item</em>}
                          {warning && <AlertCircle size={13} className={styles.railWarn} title={warning} />}
                        </span>
                        <span className={styles.railMeta}>
                          {hasMega ? 'Mega menu' : 'Plain link'} · {targetSummary(item)}
                        </span>
                      </span>
                      {!item.isVisible && <EyeOff size={14} className={styles.railHidden} />}
                    </button>

                    {isEditing && (
                      <div className={styles.railActions}>
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} title="Move up">
                          <ChevronUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} title="Move down">
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => patchItem(item.id, { isVisible: !item.isVisible })}
                          title={item.isVisible ? 'Hide from storefront' : 'Show on storefront'}
                        >
                          {item.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button type="button" className={styles.railDanger} onClick={() => removeItem(item.id)} title="Remove item">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {items.length === 0 && <p className={styles.railEmpty}>No items yet.</p>}

            {isEditing && (
              <Button type="button" variant="secondary" onClick={addItem} className={styles.railAdd}>
                <Plus size={14} /> Add item
              </Button>
            )}
          </aside>

          {/* ---------------- RIGHT: the selected item ---------------- */}
          {!selected ? (
            <div className={catalogStyles.emptyState}>
              {isEditing ? 'Add an item to get started.' : 'Select a header item to view its settings.'}
            </div>
          ) : (
            <div className={`${catalogStyles.editor} ${styles.panel}`}>
              <div className={catalogStyles.editorHeader}>
                <div>
                  <span>{selected.type}</span>
                  <h2>{selected.label?.trim() || 'Untitled item'}</h2>
                </div>
                <nav className={styles.tabs}>
                  <button type="button" onClick={() => setTab('link')} className={tab === 'link' ? styles.tabActive : styles.tab}>
                    Link
                  </button>
                  <button type="button" onClick={() => setTab('mega')} className={tab === 'mega' ? styles.tabActive : styles.tab}>
                    Mega Menu
                  </button>
                </nav>
              </div>

              {itemWarning(selected) && (
                <p className={styles.warning}>
                  <AlertCircle size={15} /> {itemWarning(selected)}
                </p>
              )}

              {tab === 'link' ? (
                <fieldset disabled={disabled} className={catalogStyles.fieldset}>
                <section className={catalogStyles.editorSection}>
                  <h3>Link Details</h3>
                  <div className={catalogStyles.twoCol}>
                    <label>
                      Label
                      <input
                        value={selected.label || ''}
                        placeholder="TOPS"
                        onChange={(e) => patchItem(selected.id, { label: e.target.value })}
                      />
                    </label>
                    <label>
                      Link Type
                      <select value={selected.type} onChange={(e) => patchItem(selected.id, { type: e.target.value })}>
                        {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                  </div>

                  {selected.type === 'CATEGORY' && (
                    <label>
                      Category
                      <select
                        value={selected.categoryId || ''}
                        onChange={(e) => patchItem(selected.id, { categoryId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Select a category</option>
                        {rootCategories.map((c) => <option key={c.id} value={c.id}>{categoryOptionLabel(c)}</option>)}
                      </select>
                    </label>
                  )}

                  {selected.type === 'COLLECTION' && (
                    <label>
                      Collection
                      <select
                        value={selected.collectionId || ''}
                        onChange={(e) => patchItem(selected.id, { collectionId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Select a collection</option>
                        {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                  )}

                  {selected.type === 'URL' && (
                    <label>
                      URL
                      <input
                        value={selected.url || ''}
                        placeholder="/pages/about or https://…"
                        onChange={(e) => patchItem(selected.id, { url: e.target.value })}
                      />
                    </label>
                  )}

                  {selected.type === 'PAGE' && (
                    <label>
                      Page Slug
                      <input
                        value={selected.page || ''}
                        placeholder="contact"
                        onChange={(e) => patchItem(selected.id, { page: e.target.value })}
                      />
                    </label>
                  )}

                  <label className={catalogStyles.inlineCheck}>
                    <input
                      type="checkbox"
                      checked={selected.isVisible !== false}
                      onChange={(e) => patchItem(selected.id, { isVisible: e.target.checked })}
                    />
                    Visible on the storefront
                  </label>
                </section>
                </fieldset>
              ) : (
                <fieldset disabled={disabled} className={catalogStyles.fieldset}>
                  <label className={catalogStyles.inlineCheck}>
                    <input type="checkbox" checked={megaEnabled} onChange={(e) => toggleMega(e.target.checked)} />
                    Show a mega-menu dropdown for this item
                  </label>

                  {!megaEnabled ? (
                    <p className={styles.hint}>
                      This item is a plain link — hovering it on the storefront opens no dropdown.
                    </p>
                  ) : (
                    // Keyed on the item so every section reopens expanded when switching
                    // items — collapsed state from a previous item should never carry over.
                    <div key={selectedId} className={styles.sectionStack}>
                    <CollapsibleSection title="Source & Layout">
                      <div className={catalogStyles.twoCol}>
                        <label>
                          Source category
                          <select
                            value={activeConfig.categoryId || ''}
                            onChange={(e) => patchConfig({ categoryId: e.target.value ? Number(e.target.value) : null })}
                          >
                            <option value="">None</option>
                            {rootCategories.map((c) => <option key={c.id} value={c.id}>{categoryOptionLabel(c)}</option>)}
                          </select>
                        </label>
                        <label>
                          Layout
                          <select value={activeConfig.layoutType} onChange={(e) => patchConfig({ layoutType: e.target.value })}>
                            {LAYOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </label>
                      </div>
                      <p className={styles.hint}>
                        Child categories of the source category become the dropdown's links and cards.
                      </p>
                    </CollapsibleSection>

                    <CollapsibleSection title="Promotional Card">
                      <div className={styles.promoLayout}>
                        <div className={styles.promoFields}>
                          <div className={catalogStyles.twoCol}>
                            <label>
                              Title
                              <input value={activeConfig.promotionalTitle || ''} placeholder="TOPS" onChange={(e) => patchConfig({ promotionalTitle: e.target.value })} />
                            </label>
                            <label>
                              Button text
                              <input value={activeConfig.promotionalButtonText || ''} placeholder="VIEW ALL TOPS" onChange={(e) => patchConfig({ promotionalButtonText: e.target.value })} />
                            </label>
                          </div>
                          <label>
                            Description
                            <textarea
                              rows={2}
                              value={activeConfig.promotionalDescription || ''}
                              placeholder={'Built for every season.\nDesigned to endure.'}
                              onChange={(e) => patchConfig({ promotionalDescription: e.target.value })}
                            />
                          </label>
                          <label>
                            Link <span className={styles.sub}>optional — hides the button when empty</span>
                            <LinkTargetField
                              // Remount on item switch AND on mega-menu off/on — the latter resets
                              // activeConfig out from under an already-mounted field otherwise.
                              key={`${selectedId}:${megaEnabled}`}
                              value={activeConfig.promotionalLink || ''}
                              onChange={(link) => patchConfig({ promotionalLink: link })}
                              categories={categories}
                              collections={collections}
                              disabled={disabled}
                            />
                          </label>
                          <label>
                            Background gradient
                            <input value={activeConfig.promotionalGradient || ''} onChange={(e) => patchConfig({ promotionalGradient: e.target.value })} />
                          </label>
                          <div className={styles.swatches}>
                            {GRADIENT_PRESETS.map((gradient) => (
                              <button
                                key={gradient}
                                type="button"
                                disabled={disabled}
                                title={gradient}
                                onClick={() => patchConfig({ promotionalGradient: gradient })}
                                className={[styles.swatch, activeConfig.promotionalGradient === gradient ? styles.swatchOn : ''].join(' ')}
                                style={{ background: gradient }}
                              />
                            ))}
                          </div>
                          <label>
                            Image <span className={styles.sub}>overrides the gradient</span>
                          </label>
                          <ImageField
                            value={activeConfig.promotionalImage || ''}
                            onChange={(url) => patchConfig({ promotionalImage: url })}
                            disabled={disabled}
                            title="Select Promotional Image"
                          />
                        </div>

                        <div
                          className={styles.preview}
                          style={{ background: activeConfig.promotionalImage ? `url(${activeConfig.promotionalImage}) center/cover` : activeConfig.promotionalGradient }}
                        >
                          <span className={styles.previewTag}>Preview</span>
                          <div className={styles.previewBody}>
                            <strong>{activeConfig.promotionalTitle || 'Title'}</strong>
                            <span>{activeConfig.promotionalDescription || 'Description'}</span>
                            {activeConfig.promotionalButtonText && <em>{activeConfig.promotionalButtonText}</em>}
                          </div>
                        </div>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Links & Cards">
                      <div className={styles.checkRow}>
                        <label className={catalogStyles.inlineCheck}>
                          <input type="checkbox" checked={activeConfig.showChildren} onChange={(e) => patchConfig({ showChildren: e.target.checked })} />
                          Show child categories as links
                        </label>
                        <label className={catalogStyles.inlineCheck}>
                          <input type="checkbox" checked={activeConfig.showFeaturedCategories} onChange={(e) => patchConfig({ showFeaturedCategories: e.target.checked })} />
                          Show the category card row
                        </label>
                      </div>

                      {activeConfig.showFeaturedCategories && (
                        <>
                          <label>
                            Card row heading
                            <input value={activeConfig.shopTitle || ''} placeholder="SHOP TOPS" onChange={(e) => patchConfig({ shopTitle: e.target.value })} />
                          </label>
                          <label>
                            Featured categories
                            <CategoryMultiSelect
                              categories={childCategories}
                              selectedIds={activeConfig.featuredCategoryIds || []}
                              onToggle={toggleFeatured}
                              onClear={() => patchConfig({ featuredCategoryIds: [] })}
                              disabled={disabled}
                            />
                          </label>
                          <p className={styles.hint}>
                            Leave everything unselected to show every child of the source category. Select specific
                            categories to curate the row instead.
                          </p>
                        </>
                      )}
                    </CollapsibleSection>

                    <CollapsibleSection title="Shop by Fit">
                      <label className={catalogStyles.inlineCheck}>
                        <input type="checkbox" checked={activeConfig.showFits} onChange={(e) => patchConfig({ showFits: e.target.checked })} />
                        Show the fit chip row
                      </label>

                      {activeConfig.showFits && (
                        <>
                          <div className={catalogStyles.twoCol}>
                            <label>
                              Heading
                              <input value={activeConfig.fitsTitle || ''} placeholder="SHOP BY FIT" onChange={(e) => patchConfig({ fitsTitle: e.target.value })} />
                            </label>
                            <label>
                              View-all label
                              <input value={activeConfig.fitsViewAllLabel || ''} placeholder="VIEW ALL BOTTOMS" onChange={(e) => patchConfig({ fitsViewAllLabel: e.target.value })} />
                            </label>
                          </div>
                          <label>
                            View-all path
                            <input value={activeConfig.fitsViewAllPath || ''} placeholder="/collections/bottoms" onChange={(e) => patchConfig({ fitsViewAllPath: e.target.value })} />
                          </label>

                          <div className={styles.fits}>
                            {(activeConfig.fits || []).map((fit, index) => (
                              <div key={index} className={styles.fitRow}>
                                <input placeholder="Relaxed Fit" value={fit.label || ''} onChange={(e) => patchFit(index, { label: e.target.value })} />
                                <input placeholder="/collections/bottoms?fit=relaxed" value={fit.path || ''} onChange={(e) => patchFit(index, { path: e.target.value })} />
                                <button type="button" onClick={() => removeFit(index)} disabled={disabled} title="Remove fit">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          {isEditing && (
                            <Button type="button" variant="secondary" onClick={addFit}><Plus size={14} /> Add fit</Button>
                          )}
                        </>
                      )}
                    </CollapsibleSection>
                    </div>
                  )}
                </fieldset>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default NavigationManagerPage;
