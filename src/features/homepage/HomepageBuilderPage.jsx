import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  GalleryHorizontalEnd,
  Grid2X2,
  GripVertical,
  Image,
  Layers3,
  Monitor,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import ImageUploadField from '@components/forms/ImageUploadField/ImageUploadField';
import { catalogApi } from '@features/catalog/catalog.api';
import bannersApi from '@features/banners/banners.api';
import homepageApi from './homepage.api';
import styles from './HomepageBuilderPage.module.scss';

// A HERO section is always rendered from a banner (either a linked banner record via
// settings.bannerPlacement, or its own media + slides), so it is labelled "Banner"
// everywhere in the UI. Only the stored `type` value stays HERO — that is what the
// API, the seeder and the storefront switch on.
const TYPES = [
  { value: 'HERO', label: 'Banner', icon: GalleryHorizontalEnd },
  { value: 'PRODUCT_COLLECTION', label: 'Product collection', icon: Package },
  { value: 'COLLECTION_GRID', label: 'Collection grid', icon: Grid2X2 },
  { value: 'STORY', label: 'Story', icon: Image },
  { value: 'REVIEWS', label: 'Reviews', icon: Eye },
  { value: 'TRUST_STRIP', label: 'Trust strip', icon: ShieldCheck },
];

const SECTION_TEMPLATES = [
  {
    type: 'HERO',
    label: 'Banner',
    description: 'Large first fold with media and primary CTA.',
    icon: GalleryHorizontalEnd,
    preset: {
      key: 'hero-main',
      title: 'Comfort is not a compromise',
      eyebrow: 'CORCOTTON Latest Drop',
      body: 'Natural essentials designed for everyday movement.',
      ctaLabel: 'Shop new arrivals',
      ctaUrl: '/collections/new-arrivals',
      productLimit: 0,
      settings: { bannerPlacement: 'HOME_HERO', layout: 'full_bleed', overlay: 'soft', slides: [] },
    },
  },
  {
    type: 'PRODUCT_COLLECTION',
    label: 'Product rail',
    description: 'Show latest drop, bestsellers, or any curated collection.',
    icon: Package,
    preset: {
      key: 'product-rail',
      title: 'The Latest Drop',
      eyebrow: 'New in',
      ctaLabel: 'View all',
      ctaUrl: '/collections/new-arrivals',
      collectionSlug: 'new-arrivals',
      productLimit: 4,
      settings: { display: 'carousel' },
    },
  },
  {
    type: 'COLLECTION_GRID',
    label: 'Collection grid',
    description: 'Tiles for top categories or collection landing pages.',
    icon: Grid2X2,
    preset: {
      key: 'shop-collections',
      title: 'Shop by Collection',
      eyebrow: 'Explore',
      ctaUrl: '/collections',
      productLimit: 0,
      settings: { collectionSlugs: ['new-arrivals', 'tops', 'bottoms'] },
    },
  },
  {
    type: 'STORY',
    label: 'Story',
    description: 'Editorial brand block with image and CTA.',
    icon: Image,
    preset: {
      key: 'brand-story',
      title: 'Built on Purpose',
      eyebrow: 'Our story',
      body: 'Soft fabrics, daily fits, and less noise in your wardrobe.',
      ctaLabel: 'Read our story',
      ctaUrl: '/pages/our-story',
      productLimit: 0,
      settings: { imageSide: 'right' },
    },
  },
  {
    type: 'REVIEWS',
    label: 'Reviews',
    description: 'Customer proof and ratings.',
    icon: Eye,
    preset: {
      key: 'reviews',
      title: 'Loved by everyday wearers',
      eyebrow: 'Reviews',
      productLimit: 0,
      settings: {
        reviews: [
          { quote: 'The fabric feels premium and still easy for daily use.', author: 'Aarav', rating: 5 },
          { quote: 'Clean fits, fast checkout, and the sizing was accurate.', author: 'Meera', rating: 5 },
        ],
      },
    },
  },
  {
    type: 'TRUST_STRIP',
    label: 'Trust strip',
    description: 'Shipping, returns, material, or payment promises.',
    icon: ShieldCheck,
    preset: {
      key: 'trust-strip',
      title: 'Trust Strip',
      productLimit: 0,
      settings: {
        items: [
          { title: 'Easy Returns', sub: 'Hassle-free & quick' },
          { title: 'Secure Checkout', sub: 'Every payment protected' },
          { title: 'Natural Essentials', sub: 'Pure. Safe. Gentle.' },
        ],
      },
    },
  },
];

// Per-type editors for the repeatable content that used to be reachable only through the
// raw "Advanced JSON" box. `parse`/`serialize` bridge the shapes the storefront expects
// (collectionSlugs is a flat string array, trust strip items may be legacy plain strings)
// to the flat objects the repeater UI edits.
const SETTINGS_EDITORS = {
  HERO: {
    title: 'Slides',
    settingKey: 'slides',
    addLabel: 'Add slide',
    empty: 'No slides yet — the banner falls back to the content and media above.',
    blank: { heading: '', sub: '', ctaLabel: '', ctaUrl: '', mediaUrl: '' },
    label: (item, index) => item.heading || `Slide ${index + 1}`,
    fields: [
      { key: 'heading', label: 'Heading' },
      { key: 'sub', label: 'Sub copy', type: 'textarea' },
      { key: 'ctaLabel', label: 'CTA label', half: true },
      { key: 'ctaUrl', label: 'CTA URL', half: true },
      { key: 'mediaUrl', label: 'Slide media', type: 'media' },
    ],
  },
  COLLECTION_GRID: {
    title: 'Collection tiles',
    settingKey: 'collectionSlugs',
    addLabel: 'Add tile',
    empty: 'No tiles picked — the storefront shows every primary collection.',
    blank: { slug: '' },
    parse: (raw) => (typeof raw === 'string' ? { slug: raw } : { slug: raw?.slug || '' }),
    serialize: (item) => item.slug,
    label: (item, index) => (item.slug ? humanizeKey(item.slug) : `Tile ${index + 1}`),
    fields: [{ key: 'slug', label: 'Collection', type: 'collection' }],
  },
  REVIEWS: {
    title: 'Reviews',
    settingKey: 'reviews',
    addLabel: 'Add review',
    empty: 'No reviews yet — the storefront shows its built-in testimonials.',
    blank: { quote: '', author: '', rating: 5 },
    label: (item, index) => item.author || `Review ${index + 1}`,
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea' },
      { key: 'author', label: 'Author', half: true },
      { key: 'rating', label: 'Rating', type: 'number', half: true, min: 1, max: 5 },
    ],
  },
  TRUST_STRIP: {
    title: 'Promises',
    settingKey: 'items',
    addLabel: 'Add promise',
    empty: 'No promises yet — the storefront shows its built-in strip.',
    blank: { title: '', sub: '' },
    parse: (raw) => (typeof raw === 'string' ? { title: raw, sub: '' } : { title: raw?.title || '', sub: raw?.sub || '' }),
    label: (item, index) => item.title || `Promise ${index + 1}`,
    fields: [
      { key: 'title', label: 'Title', half: true },
      { key: 'sub', label: 'Sub copy', half: true },
    ],
  },
};

// Describes each section type for the builder: which config fields its inspector exposes,
// and where the content it actually renders is managed. `configFields` keeps the inspector
// honest — a Trust strip has no collection or "view all" button, so it must not offer them.
const TYPE_CONFIG = {
  HERO: {
    contentLabel: 'Manage Banners',
    contentPath: '/banners',
    configFields: ['banner', 'layout'],
  },
  PRODUCT_COLLECTION: {
    contentLabel: 'Manage Collections',
    contentPath: '/collections',
    configFields: ['collection', 'layout', 'showViewAll', 'viewAllText', 'itemsToShow'],
  },
  COLLECTION_GRID: {
    contentLabel: 'Manage Collections',
    contentPath: '/collections',
    configFields: ['layout', 'showViewAll', 'viewAllText'],
  },
  STORY: {
    contentLabel: 'Manage Media',
    contentPath: '/media',
    configFields: [],
  },
  REVIEWS: {
    contentLabel: 'Manage Reviews',
    contentPath: '/reviews',
    configFields: ['itemsToShow'],
  },
  TRUST_STRIP: {
    contentLabel: null,
    contentPath: null,
    configFields: [],
  },
};

const typeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.PRODUCT_COLLECTION;
const countLabel = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

// Fields compared verbatim when deciding whether the inspector holds unsaved edits.
const DIRTY_FIELDS = [
  'key', 'type', 'title', 'eyebrow', 'body', 'ctaLabel', 'ctaUrl',
  'mediaUrl', 'mobileMediaUrl', 'collectionSlug', 'productLimit', 'status', 'sortOrder',
];

const emptySection = {
  key: '',
  type: 'PRODUCT_COLLECTION',
  title: '',
  eyebrow: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  mediaUrl: '',
  mobileMediaUrl: '',
  collectionSlug: '',
  productLimit: 4,
  status: 'ACTIVE',
  sortOrder: 0,
  settings: {},
};

const jsonPretty = (value) => JSON.stringify(value || {}, null, 2);
const parseMaybeJson = (value, fallback) => {
  try {
    return value.trim() ? JSON.parse(value) : {};
  } catch {
    return fallback || {};
  }
};
const formatType = (type) => String(type || '').replace(/_/g, ' ');
const typeMeta = (type) => TYPES.find((item) => item.value === type) || TYPES[1];
const isVideo = (url = '') => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
const isTechnicalBannerName = (value = '') => /^section[-_\s]*banner$/i.test(String(value).trim());
const humanizeKey = (value = '') => String(value || '')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

function HomepageBuilderPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [collections, setCollections] = useState([]);
  const [banners, setBanners] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptySection);
  const [settingsText, setSettingsText] = useState('{}');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndexRef = useRef(null);

  const selected = useMemo(() => sections.find((section) => Number(section.id) === Number(selectedId)) || null, [sections, selectedId]);
  const draftSettings = useMemo(() => parseMaybeJson(settingsText, form.settings), [form.settings, settingsText]);
  const draftSection = useMemo(() => ({ ...form, settings: draftSettings }), [draftSettings, form]);
  const bannersByPlacement = useMemo(() => banners.reduce((index, banner) => {
    if (!banner.placement) return index;
    if (!index[banner.placement]) index[banner.placement] = [];
    index[banner.placement].push(banner);
    return index;
  }, {}), [banners]);
  const bannerPlacements = useMemo(() => Object.keys(bannersByPlacement).sort(), [bannersByPlacement]);
  const resolveBanner = (section) => {
    const placement = section?.settings?.bannerPlacement || section?.settings?.banner_placement;
    return placement ? bannersByPlacement[placement]?.[0] || null : null;
  };
  // The element's own title wins over the linked banner's title so that typing in the
  // inspector's Title field renames the row live; the banner title is only a fallback for
  // sections that were never given one.
  const sectionName = (section) => {
    if (section?.title && !isTechnicalBannerName(section.title)) return section.title;
    const banner = resolveBanner(section);
    if (banner?.title) return banner.title;
    if (section?.key && !isTechnicalBannerName(section.key)) return humanizeKey(section.key);
    return typeMeta(section?.type).label;
  };
  // The row's second line says what the section will actually render, not just its type —
  // an element pointing at nothing is the single most common misconfiguration here, and
  // "No collection selected yet" makes that visible without opening the inspector.
  const sectionMeta = (section) => {
    const settings = section?.settings || {};

    if (section?.type === 'HERO') {
      const banner = resolveBanner(section);
      if (banner?.title) return `Shows "${banner.title}"`;
      const slides = Array.isArray(settings.slides) ? settings.slides.filter((slide) => slide?.heading || slide?.mediaUrl) : [];
      if (slides.length) return `Shows ${countLabel(slides.length, 'slide')}`;
      if (section?.mediaUrl) return 'Shows its own media';
      return 'No banner linked yet';
    }

    if (section?.type === 'PRODUCT_COLLECTION') {
      if (!section.collectionSlug) return 'No collection selected yet';
      const match = collections.find((collection) => collection.slug === section.collectionSlug);
      return `Shows "${match?.name || section.collectionSlug}"`;
    }

    if (section?.type === 'COLLECTION_GRID') {
      const slugs = Array.isArray(settings.collectionSlugs) ? settings.collectionSlugs.filter(Boolean) : [];
      return slugs.length ? `Shows ${countLabel(slugs.length, 'collection')}` : 'Shows every primary collection';
    }

    if (section?.type === 'REVIEWS') {
      const reviews = Array.isArray(settings.reviews) ? settings.reviews : [];
      return reviews.length ? `Shows ${countLabel(reviews.length, 'review')}` : 'No reviews added yet';
    }

    if (section?.type === 'TRUST_STRIP') {
      const items = Array.isArray(settings.items) ? settings.items : [];
      return items.length ? `Shows ${countLabel(items.length, 'promise')}` : 'No promises added yet';
    }

    return section?.body ? 'Editorial block with image and CTA' : formatType(section?.type);
  };
  const sortedSections = useMemo(() => [...sections].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || Number(a.id) - Number(b.id)), [sections]);
  const previewSections = useMemo(() => {
    if (!draftSection.key && !selected) return sortedSections;
    if (!selected) return [...sortedSections, { ...draftSection, id: 'draft', isDraft: true }];
    return sortedSections.map((section) => (Number(section.id) === Number(selected.id) ? { ...section, ...draftSection } : section));
  }, [draftSection, selected, sortedSections]);
  const metrics = useMemo(() => ({
    total: sections.length,
    active: sections.filter((section) => section.status === 'ACTIVE').length,
    draft: sections.filter((section) => section.status === 'DRAFT').length,
  }), [sections]);
  // Invalid JSON used to be swallowed by parseMaybeJson's fallback, so edits vanished with
  // no explanation. Surface the parse error and block Save until it is fixed.
  const settingsError = useMemo(() => {
    if (!settingsText.trim()) return '';
    try {
      JSON.parse(settingsText);
      return '';
    } catch (err) {
      return err.message;
    }
  }, [settingsText]);
  const isDirty = useMemo(() => {
    if (!selected) return Boolean(form.key);
    if (DIRTY_FIELDS.some((field) => String(form[field] ?? '') !== String(selected[field] ?? ''))) return true;
    return JSON.stringify(draftSettings || {}) !== JSON.stringify(selected.settings || {});
  }, [draftSettings, form, selected]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [homeData, collectionData, bannerData] = await Promise.all([
        homepageApi.list(),
        catalogApi.collections.list({ limit: 100 }),
        bannersApi.list(),
      ]);
      const nextSections = homeData.sections || [];
      setSections(nextSections);
      setCollections(collectionData.collections || []);
      setBanners(bannerData.banners || []);
      if (!selectedId && nextSections.length) openSection(nextSections[0], { keepNotice: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load homepage sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSection = (section, options = {}) => {
    setSelectedId(section.id || null);
    setForm({ ...emptySection, ...section });
    setSettingsText(jsonPretty(section.settings));
    setError('');
    if (!options.keepNotice) setNotice('');
  };

  // Every user-initiated switch away from the inspector goes through this so in-progress
  // edits are never dropped silently.
  const requestOpen = (section) => {
    // The unsaved draft is already loaded in the inspector — clicking its preview block
    // must not "open" a section that has no id yet.
    if (!section || section.isDraft) return;
    if (Number(section.id) === Number(selectedId)) return;
    if (isDirty && !window.confirm('Discard unsaved changes to this element?')) return;
    openSection(section);
  };

  const startCreate = (template = SECTION_TEMPLATES[1]) => {
    if (isDirty && !window.confirm('Discard unsaved changes to this element?')) return;
    const sortOrder = sections.length ? Math.max(...sections.map((section) => Number(section.sortOrder) || 0)) + 10 : 10;
    const suffix = sections.some((section) => section.key === template.preset.key) ? `-${Date.now().toString().slice(-5)}` : '';
    setSelectedId(null);
    setForm({
      ...emptySection,
      ...template.preset,
      key: `${template.preset.key}${suffix}`,
      type: template.type,
      status: 'DRAFT',
      sortOrder,
    });
    setSettingsText(jsonPretty(template.preset.settings));
    setError('');
    setNotice('');
  };

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateSetting = (key, value) => {
    const nextSettings = { ...draftSettings, [key]: value };
    setForm((current) => ({ ...current, settings: nextSettings }));
    setSettingsText(jsonPretty(nextSettings));
  };

  const normalizePayload = () => {
    let settings;
    try {
      settings = settingsText.trim() ? JSON.parse(settingsText) : {};
    } catch {
      throw new Error(`Advanced settings must be valid JSON — ${settingsError}`);
    }

    return {
      ...form,
      key: form.key.trim(),
      productLimit: Number(form.productLimit) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      mediaUrl: form.mediaUrl || null,
      mobileMediaUrl: form.mobileMediaUrl || null,
      collectionSlug: form.collectionSlug || null,
      settings,
    };
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = normalizePayload();
      const data = selected ? await homepageApi.update(selected.id, payload) : await homepageApi.create(payload);
      const saved = data.section;
      setNotice(`${saved.title || saved.key} saved.`);
      await load();
      openSection(saved, { keepNotice: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save homepage section');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${sectionName(selected)}" from the homepage? This cannot be undone.`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await homepageApi.remove(selected.id);
      setNotice('Homepage section deleted.');
      setSelectedId(null);
      setForm(emptySection);
      setSettingsText('{}');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete homepage section');
    } finally {
      setSaving(false);
    }
  };

  // Optimistically renumbers every row to (index + 1) * 10 and persists the whole order in
  // one call, so a failed request can just reload the server's truth.
  const persistOrder = async (ordered, message) => {
    const reordered = ordered.map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }));
    setSections(reordered);
    setSaving(true);
    setError('');
    try {
      await homepageApi.reorder(reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder })));
      setNotice(message);
      const movedSelected = selected ? reordered.find((item) => item.id === selected.id) : null;
      if (movedSelected) updateField('sortOrder', movedSelected.sortOrder);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to reorder homepage sections');
      await load();
    } finally {
      setSaving(false);
    }
  };

  // Drag-and-drop and the arrow buttons share this. It lifts the row out and re-inserts it
  // at the target index (move), rather than swapping the two rows, which is what a drop
  // several positions away has to mean.
  const reorderSections = (fromIndex, toIndex) => {
    const size = sortedSections.length;
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= size || toIndex >= size) return;
    const next = [...sortedSections];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistOrder(next, `${sectionName(moved)} moved to position ${toIndex + 1}.`);
  };

  const moveSection = (section, direction) => {
    const currentIndex = sortedSections.findIndex((item) => item.id === section.id);
    reorderSections(currentIndex, currentIndex + direction);
  };

  const handleDragStart = (event, index) => {
    dragIndexRef.current = index;
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (event, index) => {
    event.preventDefault();
    const dropped = dragIndexRef.current ?? Number(event.dataTransfer.getData('text/plain'));
    dragIndexRef.current = null;
    setDragOverIndex(null);
    reorderSections(Number(dropped), index);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleRowKeyDown = (event, section, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      requestOpen(section);
      return;
    }
    if (!event.altKey) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      reorderSections(index, index - 1);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      reorderSections(index, index + 1);
    }
  };

  const toggleStatus = async (section) => {
    const nextStatus = section.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSaving(true);
    setError('');
    try {
      const data = await homepageApi.update(section.id, { status: nextStatus });
      setSections((current) => current.map((item) => (item.id === section.id ? data.section : item)));
      // Patch just the status rather than reloading the whole element into the form — the
      // eye toggle must not throw away whatever else is being edited right now.
      if (selected?.id === section.id) updateField('status', nextStatus);
      setNotice(`${sectionName(section)} ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update section status');
    } finally {
      setSaving(false);
    }
  };

  const renderStructure = () => (
    <aside className={styles.builderRail}>
      <div className={styles.railBlock}>
        <div className={styles.railHeader}>
          <span>Page structure</span>
          <b>{metrics.active}/{metrics.total}</b>
        </div>
        <p className={styles.railIntro}>
          Manage and customise the storefront homepage sections.
          <br />
          Drag &amp; drop to reorder sections.
        </p>
        <div className={styles.sectionList}>
          {sortedSections.map((section, index) => {
            const meta = typeMeta(section.type);
            const Icon = meta.icon;
            const selectedRow = selected?.id === section.id;
            const visible = section.status === 'ACTIVE';
            const rowClass = [
              styles.sectionRow,
              selectedRow ? styles.sectionRowSelected : '',
              dragOverIndex === index ? styles.sectionRowDropTarget : '',
              visible ? '' : styles.sectionRowHidden,
            ].filter(Boolean).join(' ');
            return (
              // A div rather than a button: the row carries its own grip and visibility
              // buttons, and a button cannot legally contain buttons.
              <div
                key={section.id}
                role="button"
                tabIndex={0}
                aria-current={selectedRow}
                className={rowClass}
                draggable={!saving}
                onClick={() => requestOpen(section)}
                onKeyDown={(event) => handleRowKeyDown(event, section, index)}
                onDragStart={(event) => handleDragStart(event, index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={handleDragEnd}
              >
                <button
                  type="button"
                  className={styles.dragButton}
                  title="Drag to reorder — or focus the row and hold Alt with the arrow keys"
                  onClick={(event) => event.stopPropagation()}
                >
                  <GripVertical size={15} />
                </button>
                <span className={styles.rowIndex}>{index + 1}</span>
                <span className={styles.rowIcon}><Icon size={16} /></span>
                <span className={styles.rowCopy}>
                  <strong>{sectionName(section)}</strong>
                  <small>{sectionMeta(section)}</small>
                </span>
                <span className={`${styles.statusDot} ${styles[String(section.status || '').toLowerCase()]}`} />
                <button
                  type="button"
                  className={styles.visibilityButton}
                  title={visible ? 'Visible — click to hide' : 'Hidden — click to show'}
                  disabled={saving}
                  onClick={(event) => { event.stopPropagation(); toggleStatus(section); }}
                >
                  {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            );
          })}
          {!sortedSections.length && <div className={styles.railEmpty}>No sections yet.</div>}
          {sortedSections.length > 1 ? <p className={styles.railHint}>Tip: focus a row and hold Alt with the arrow keys to reorder without a mouse.</p> : null}
        </div>
      </div>

      <div className={styles.railBlock}>
        <div className={styles.railHeader}>
          <span>Add element</span>
          <Plus size={15} />
        </div>
        <div className={styles.templateList}>
          {SECTION_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button key={template.label} type="button" className={styles.templateButton} onClick={() => startCreate(template)} title={template.description}>
                <Icon size={17} />
                <span>
                  <strong>{template.label}</strong>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );

  const renderPreviewMedia = (section) => {
    const mediaUrl = previewMode === 'mobile' ? section.mobileMediaUrl || section.mediaUrl : section.mediaUrl;
    if (!mediaUrl) return <div className={styles.previewMediaEmpty}><Image size={22} /></div>;
    if (isVideo(mediaUrl)) {
      return (
        <video className={styles.previewMedia} src={mediaUrl} muted loop playsInline autoPlay>
          <track kind="captions" />
        </video>
      );
    }
    return <img className={styles.previewMedia} src={mediaUrl} alt="" />;
  };

  const renderPreviewSection = (section) => {
    const active = selected?.id === section.id || (section.isDraft && !selected);
    const settings = section.settings || {};
    if (section.status !== 'ACTIVE' && !active) return null;

    if (section.type === 'HERO') {
      const banner = resolveBanner(section);
      const heroMedia = banner
        ? { ...section, mediaUrl: banner.videoUrl || banner.imageUrl, mobileMediaUrl: banner.mobileImageUrl || banner.imageUrl }
        : section;
      const heroTitle = banner?.title || section.title || 'Hero headline';
      const heroEyebrow = banner?.subtitle || section.eyebrow || 'Hero';
      const heroBody = banner?.description || section.body || 'Hero supporting copy appears here.';
      const heroCta = banner?.primaryCta?.enabled ? banner.primaryCta.label : section.ctaLabel;
      return (
        <button key={section.id} type="button" className={`${styles.previewHero} ${active ? styles.previewActive : ''}`} onClick={() => requestOpen(section)}>
          {renderPreviewMedia(heroMedia)}
          <span className={styles.previewHeroCopy}>
            <small>{heroEyebrow}</small>
            <strong>{heroTitle}</strong>
            <em>{heroBody}</em>
            {heroCta ? <b>{heroCta}</b> : null}
          </span>
        </button>
      );
    }

    if (section.type === 'PRODUCT_COLLECTION') {
      const count = Math.max(Math.min(Number(section.productLimit) || 4, 6), 2);
      return (
        <button key={section.id} type="button" className={`${styles.previewBand} ${active ? styles.previewActive : ''}`} onClick={() => requestOpen(section)}>
          <span className={styles.previewBandHeader}>
            <span>
              <small>{section.eyebrow || section.collectionSlug || 'Collection'}</small>
              <strong>{section.title || 'Product collection'}</strong>
            </span>
            {section.ctaLabel && settings.showViewAll !== false ? <em>{section.ctaLabel}</em> : null}
          </span>
          <span className={styles.productPreviewGrid}>
            {Array.from({ length: count }).map((_, index) => (
              <span key={`${section.id}-product-${index}`} className={styles.productTile}>
                <ShoppingBag size={18} />
              </span>
            ))}
          </span>
        </button>
      );
    }

    if (section.type === 'COLLECTION_GRID') {
      // settings.collectionSlugs is the shape the storefront's CategorySection reads;
      // settings.collections is the older {title, slug} shape kept working for old rows.
      const slugTiles = (Array.isArray(settings.collectionSlugs) ? settings.collectionSlugs : [])
        .filter(Boolean)
        .map((slug) => ({ title: collections.find((item) => item.slug === slug)?.name || humanizeKey(slug), slug }));
      const legacyTiles = Array.isArray(settings.collections) ? settings.collections : [];
      const picked = slugTiles.length ? slugTiles : legacyTiles;
      const collectionsList = picked.length
        ? picked
        : collections.slice(0, 4).map((collection) => ({ title: collection.name, slug: collection.slug }));
      return (
        <button key={section.id} type="button" className={`${styles.previewBand} ${active ? styles.previewActive : ''}`} onClick={() => requestOpen(section)}>
          <span className={styles.previewBandHeader}>
            <span>
              <small>{section.eyebrow || 'Collections'}</small>
              <strong>{section.title || 'Shop by Collection'}</strong>
            </span>
            {section.ctaLabel && settings.showViewAll !== false ? <em>{section.ctaLabel}</em> : null}
          </span>
          <span className={styles.collectionPreviewGrid}>
            {collectionsList.slice(0, 6).map((collection, index) => (
              <span key={`${collection.slug || collection.title}-${index}`}>
                <Grid2X2 size={18} />
                <b>{collection.title || collection.name || collection.slug}</b>
              </span>
            ))}
          </span>
        </button>
      );
    }

    if (section.type === 'STORY') {
      return (
        <button key={section.id} type="button" className={`${styles.previewStory} ${active ? styles.previewActive : ''}`} onClick={() => requestOpen(section)}>
          <span className={styles.storyCopy}>
            <small>{section.eyebrow || 'Story'}</small>
            <strong>{section.title || 'Brand story'}</strong>
            <em>{section.body || 'Editorial content appears here.'}</em>
            {section.ctaLabel ? <b>{section.ctaLabel}</b> : null}
          </span>
          <span className={styles.storyMedia}>{renderPreviewMedia(section)}</span>
        </button>
      );
    }

    if (section.type === 'REVIEWS') {
      const reviews = Array.isArray(settings.reviews) && settings.reviews.length ? settings.reviews : [{ quote: 'Customer review preview.', author: 'Customer', rating: 5 }];
      return (
        <button key={section.id} type="button" className={`${styles.previewBand} ${active ? styles.previewActive : ''}`} onClick={() => requestOpen(section)}>
          <span className={styles.previewBandHeader}>
            <span>
              <small>{section.eyebrow || 'Reviews'}</small>
              <strong>{section.title || 'Reviews'}</strong>
            </span>
          </span>
          <span className={styles.reviewPreviewGrid}>
            {reviews.slice(0, Math.max(Number(section.productLimit) || 3, 1)).map((review, index) => (
              <span key={`${review.author || 'review'}-${index}`}>
                <b>"{review.quote}"</b>
                <small>{'\u2605'.repeat(Math.min(Math.max(Number(review.rating) || 5, 1), 5))} {review.author || 'Customer'}</small>
              </span>
            ))}
          </span>
        </button>
      );
    }

    const rawItems = Array.isArray(settings.items) && settings.items.length
      ? settings.items
      : ['Easy returns', 'Secure checkout', 'Natural essentials'];
    const items = rawItems.map((item) => (typeof item === 'string' ? { title: item, sub: '' } : item || {}));
    return (
      <button key={section.id} type="button" className={`${styles.previewTrust} ${active ? styles.previewActive : ''}`} onClick={() => requestOpen(section)}>
        {items.slice(0, 4).map((item, index) => (
          <span key={`${item.title || 'promise'}-${index}`}><ShieldCheck size={16} /> {item.title}</span>
        ))}
      </button>
    );
  };

  const renderPreview = () => (
    <main className={styles.previewColumn}>
      <div className={styles.previewToolbar}>
        <div>
          <span>Live preview</span>
          <strong>{selected ? sectionName(draftSection) : 'Homepage'}</strong>
        </div>
        <div className={styles.deviceToggle}>
          <button type="button" className={previewMode === 'desktop' ? styles.deviceActive : ''} onClick={() => setPreviewMode('desktop')} title="Desktop preview">
            <Monitor size={16} />
          </button>
          <button type="button" className={previewMode === 'mobile' ? styles.deviceActive : ''} onClick={() => setPreviewMode('mobile')} title="Mobile preview">
            <Smartphone size={16} />
          </button>
        </div>
      </div>
      <div className={`${styles.previewFrame} ${previewMode === 'mobile' ? styles.mobileFrame : ''}`}>
        <div className={styles.storefrontTopbar}>
          <strong>corcotton</strong>
          <span>New In</span>
          <span>Collections</span>
          <span>Essentials</span>
        </div>
        {previewSections.map(renderPreviewSection)}
        {!previewSections.length && <div className={styles.previewEmpty}>Add a section to begin building the homepage.</div>}
      </div>
    </main>
  );

  const renderRepeaterField = (field, item, index, patch) => {
    const value = item[field.key] ?? '';
    const className = field.half ? styles.repeaterHalf : styles.repeaterFull;

    if (field.type === 'media') {
      return (
        <div key={field.key} className={styles.repeaterFull}>
          <ImageUploadField label={field.label} value={value} onChange={(url) => patch(index, field.key, url)} folder="homepage" />
        </div>
      );
    }

    if (field.type === 'collection') {
      return (
        <label key={field.key} className={className}>
          {field.label}
          <select value={value} onChange={(event) => patch(index, field.key, event.target.value)}>
            <option value="">Select a collection</option>
            {collections.map((collection) => (
              <option key={collection.id || collection.slug} value={collection.slug}>{collection.name}</option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === 'textarea') {
      return (
        <label key={field.key} className={styles.repeaterFull}>
          {field.label}
          <textarea value={value} rows={2} onChange={(event) => patch(index, field.key, event.target.value)} />
        </label>
      );
    }

    return (
      <label key={field.key} className={className}>
        {field.label}
        <input
          type={field.type || 'text'}
          min={field.min}
          max={field.max}
          value={value}
          onChange={(event) => patch(index, field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
        />
      </label>
    );
  };

  // One repeater drives every list-shaped setting (banner slides, collection tiles,
  // reviews, trust promises) so none of them needs hand-edited JSON any more. Writes go
  // through updateSetting, which keeps the Advanced JSON box in sync.
  const renderRepeater = () => {
    const config = SETTINGS_EDITORS[form.type];
    if (!config) return null;

    const parse = config.parse || ((raw) => ({ ...(raw || {}) }));
    const serialize = config.serialize || ((item) => item);
    const raw = draftSettings[config.settingKey];
    const items = (Array.isArray(raw) ? raw : []).map(parse);

    const commit = (nextItems) => updateSetting(config.settingKey, nextItems.map(serialize));
    const patch = (index, key, value) => commit(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    const move = (index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      commit(next);
    };

    return (
      <section className={styles.inspectorPanel}>
        <h3>{config.title}</h3>
        {items.map((item, index) => (
          <div key={`${config.settingKey}-${index}`} className={styles.repeaterItem}>
            <div className={styles.repeaterBar}>
              <strong>{config.label(item, index)}</strong>
              <span className={styles.repeaterActions}>
                <button type="button" title="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={13} /></button>
                <button type="button" title="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={13} /></button>
                <button type="button" title="Remove" onClick={() => commit(items.filter((_, i) => i !== index))}><X size={13} /></button>
              </span>
            </div>
            <div className={styles.repeaterFields}>
              {config.fields.map((field) => renderRepeaterField(field, item, index, patch))}
            </div>
          </div>
        ))}
        {!items.length ? <p className={styles.mediaHint}>{config.empty}</p> : null}
        <Button type="button" size="sm" variant="secondary" onClick={() => commit([...items, { ...config.blank }])}>
          <Plus size={14} /> {config.addLabel}
        </Button>
      </section>
    );
  };

  const renderInspector = () => {
    const meta = typeMeta(form.type);
    const Icon = meta.icon;
    const config = typeConfig(form.type);
    const fields = config.configFields;
    const showViewAll = draftSettings.showViewAll !== false;
    return (
      <form className={styles.inspector} onSubmit={save}>
        <div className={styles.inspectorHeader}>
          <span className={styles.inspectorIcon}><Icon size={18} /></span>
          <span>
            <small>{selected ? 'Editing element' : 'Draft element'}</small>
            <strong>{sectionName(form)}</strong>
            <i>Configure your section content and appearance</i>
          </span>
        </div>

        {selected ? (
          <div className={styles.inspectorActions}>
            <Button type="button" size="sm" variant="secondary" onClick={() => toggleStatus(selected)} disabled={saving}>
              {selected.status === 'ACTIVE' ? <><EyeOff size={15} /> Hide</> : <><Eye size={15} /> Publish</>}
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={remove} disabled={saving}><Trash2 size={15} /> Delete</Button>
          </div>
        ) : null}

        <section className={styles.inspectorPanel}>
          <h3>Element</h3>
          <label>Section key<input value={form.key} onChange={(event) => updateField('key', event.target.value)} required /></label>
          <label>
            Type
            <select value={form.type} onChange={(event) => updateField('type', event.target.value)}>
              {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <div className={styles.inlineFields}>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label>Order<input type="number" value={form.sortOrder} onChange={(event) => updateField('sortOrder', event.target.value)} /></label>
          </div>
        </section>

        <section className={styles.inspectorPanel}>
          <h3>Content</h3>
          <label>Eyebrow<input value={form.eyebrow || ''} onChange={(event) => updateField('eyebrow', event.target.value)} /></label>
          <label>Title<input value={form.title || ''} onChange={(event) => updateField('title', event.target.value)} /></label>
          <label>Body<textarea value={form.body || ''} onChange={(event) => updateField('body', event.target.value)} rows={4} /></label>
          {/* Types that render a "View all" link get those controls in the Display panel
              instead, so the same ctaLabel/ctaUrl pair is never edited in two places. */}
          {fields.includes('viewAllText') ? null : (
            <div className={styles.inlineFields}>
              <label>CTA label<input value={form.ctaLabel || ''} onChange={(event) => updateField('ctaLabel', event.target.value)} /></label>
              <label>CTA URL<input value={form.ctaUrl || ''} onChange={(event) => updateField('ctaUrl', event.target.value)} placeholder="/collections/new-arrivals" /></label>
            </div>
          )}
        </section>

        {fields.length ? (
          <section className={styles.inspectorPanel}>
            <h3>Display</h3>

            {fields.includes('banner') ? (
              <label>
                Banner
                <select value={draftSettings.bannerPlacement || ''} onChange={(event) => updateSetting('bannerPlacement', event.target.value)}>
                  <option value="">No banner linked</option>
                  {bannerPlacements.map((placement) => (
                    <option key={placement} value={placement}>
                      {bannersByPlacement[placement]?.[0]?.title || humanizeKey(placement)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {fields.includes('collection') ? (
              <label>
                Collection
                <select value={form.collectionSlug || ''} onChange={(event) => updateField('collectionSlug', event.target.value)}>
                  <option value="">Select a collection…</option>
                  {collections.map((collection) => (
                    <option key={collection.id || collection.slug} value={collection.slug}>{collection.name} ({collection.slug})</option>
                  ))}
                </select>
              </label>
            ) : null}

            {fields.includes('layout') ? (
              <label>
                Layout
                <select value={draftSettings.layout || 'grid'} onChange={(event) => updateSetting('layout', event.target.value)}>
                  <option value="grid">Grid</option>
                  <option value="slider">Slider</option>
                </select>
              </label>
            ) : null}

            {fields.includes('showViewAll') ? (
              <label className={styles.toggleRow}>
                <input type="checkbox" checked={showViewAll} onChange={(event) => updateSetting('showViewAll', event.target.checked)} />
                Show &ldquo;View all&rdquo; button
              </label>
            ) : null}

            {fields.includes('viewAllText') && showViewAll ? (
              <div className={styles.inlineFields}>
                <label>
                  &ldquo;View all&rdquo; button text
                  <input value={form.ctaLabel || ''} onChange={(event) => updateField('ctaLabel', event.target.value)} placeholder="VIEW ALL" />
                </label>
                <label>
                  &ldquo;View all&rdquo; link
                  <input value={form.ctaUrl || ''} onChange={(event) => updateField('ctaUrl', event.target.value)} placeholder="/collections/new-arrivals" />
                </label>
              </div>
            ) : null}

            {fields.includes('itemsToShow') ? (
              <label className={styles.rangeRow}>
                Items to show
                <span>
                  <input type="range" min="1" max="24" value={Number(form.productLimit) || 4} onChange={(event) => updateField('productLimit', Number(event.target.value))} />
                  <b>{Number(form.productLimit) || 4}</b>
                </span>
              </label>
            ) : null}
          </section>
        ) : null}

        <section className={styles.inspectorPanel}>
          <h3>Media</h3>
          <ImageUploadField label="Desktop media" value={form.mediaUrl || ''} onChange={(url) => updateField('mediaUrl', url)} folder="homepage" />
          <ImageUploadField label="Mobile media" value={form.mobileMediaUrl || ''} onChange={(url) => updateField('mobileMediaUrl', url)} folder="homepage" />
          {form.mediaUrl ? (
            <p className={styles.mediaHint}>{isVideo(form.mediaUrl) ? <Video size={14} /> : <Image size={14} />} Media is shown in live preview.</p>
          ) : null}
        </section>

        {renderRepeater()}

        <section className={styles.inspectorPanel}>
          <h3>Advanced JSON</h3>
          <textarea className={styles.codeArea} value={settingsText} onChange={(event) => setSettingsText(event.target.value)} rows={10} spellCheck={false} />
          {settingsError ? <p className={styles.fieldError}>{settingsError}</p> : null}
        </section>

        <div className={styles.inspectorFooter}>
          {config.contentPath ? (
            <button type="button" className={styles.contentLink} onClick={() => navigate(config.contentPath)}>
              {config.contentLabel} <ExternalLink size={13} />
            </button>
          ) : <span />}
          <Button type="submit" size="sm" loading={saving} disabled={Boolean(settingsError)}>
            <Save size={15} /> Save Changes
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Storefront"
        title="Homepage Builder"
        icon={Layers3}
        meta={`${metrics.active}/${metrics.total} active${metrics.draft ? `, ${metrics.draft} draft` : ''}`}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} /> Refresh
            </Button>
            <Button type="button" onClick={() => startCreate()}>
              <Plus size={16} /> Add Section
            </Button>
          </>
        )}
      />

      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.builderShell}>
        {renderStructure()}
        {renderInspector()}
        {renderPreview()}
      </div>
    </div>
  );
}

export default HomepageBuilderPage;
