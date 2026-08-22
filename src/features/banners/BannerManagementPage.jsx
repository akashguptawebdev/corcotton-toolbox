import { useEffect, useMemo, useState } from 'react';
import { Image, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import ImageUploadField from '@components/forms/ImageUploadField/ImageUploadField';
import bannersApi from './banners.api';
import styles from './BannerManagementPage.module.scss';

const EMPTY_CTA = { enabled: false, label: '', actionType: 'URL', actionValue: '' };
const EMPTY_FORM = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  mobileImageUrl: '',
  videoUrl: '',
  placement: 'HOME_HERO',
  linkType: 'NONE',
  linkValue: '',
  primaryCta: { ...EMPTY_CTA },
  secondaryCta: { ...EMPTY_CTA },
  sortOrder: 0,
  status: 'ACTIVE',
  startsAt: '',
  endsAt: '',
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const fromApi = (banner) => ({
  ...EMPTY_FORM,
  ...banner,
  startsAt: toDateInput(banner.startsAt),
  endsAt: toDateInput(banner.endsAt),
  primaryCta: { ...EMPTY_CTA, ...(banner.primaryCta || {}) },
  secondaryCta: { ...EMPTY_CTA, ...(banner.secondaryCta || {}) },
});

const normalizePlacement = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

function CtaFields({ title, value, onChange }) {
  return (
    <div className={styles.ctaBox}>
      <label className={styles.checkRow}>
        <input type="checkbox" checked={Boolean(value.enabled)} onChange={(event) => onChange({ ...value, enabled: event.target.checked })} />
        {title}
      </label>
      {value.enabled ? (
        <div className={styles.inlineFields}>
          <label>Label<input value={value.label || ''} onChange={(event) => onChange({ ...value, label: event.target.value })} /></label>
          <label>
            Type
            <select value={value.actionType || 'URL'} onChange={(event) => onChange({ ...value, actionType: event.target.value })}>
              <option value="URL">URL</option>
              <option value="COLLECTION">Collection</option>
              <option value="CATEGORY">Category</option>
              <option value="PRODUCT">Product</option>
            </select>
          </label>
          <label>Value<input value={value.actionValue || ''} onChange={(event) => onChange({ ...value, actionValue: event.target.value })} /></label>
        </div>
      ) : null}
    </div>
  );
}

function BannerManagementPage() {
  const [banners, setBanners] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(() => banners.find((banner) => Number(banner.id) === Number(selectedId)) || null, [banners, selectedId]);
  const activeCount = useMemo(() => banners.filter((banner) => banner.status === 'ACTIVE').length, [banners]);
  const placements = useMemo(() => [...new Set(['HOME_HERO', ...banners.map((banner) => banner.placement).filter(Boolean)])], [banners]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bannersApi.list();
      const next = data.banners || [];
      setBanners(next);
      if (!selectedId && next.length) openBanner(next[0], { keepNotice: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openBanner = (banner, options = {}) => {
    setSelectedId(banner.id);
    setForm(fromApi(banner));
    setError('');
    if (!options.keepNotice) setNotice('');
  };

  const startCreate = () => {
    const sortOrder = banners.length ? Math.max(...banners.map((banner) => Number(banner.sortOrder) || 0)) + 10 : 10;
    setSelectedId(null);
    setForm({ ...EMPTY_FORM, sortOrder });
    setNotice('');
    setError('');
  };

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const payload = {
        ...form,
        placement: normalizePlacement(form.placement),
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        mobileImageUrl: form.mobileImageUrl || null,
        videoUrl: form.videoUrl || null,
        linkValue: form.linkValue || null,
      };
      const data = selected ? await bannersApi.update(selected.id, payload) : await bannersApi.create(payload);
      setNotice(`${data.banner.title} saved.`);
      await load();
      openBanner(data.banner, { keepNotice: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save banner');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setSaving(true);
    setNotice('');
    setError('');
    try {
      await bannersApi.remove(selected.id);
      setNotice('Banner deleted.');
      setSelectedId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Storefront"
        title="Banners"
        icon={Image}
        meta={`${activeCount}/${banners.length} active`}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</Button>
            <Button type="button" onClick={startCreate}><Plus size={16} /> New Banner</Button>
          </>
        )}
      />

      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.shell}>
        <aside className={styles.listPanel}>
          <div className={styles.panelHeader}>Banners</div>
          {banners.map((banner) => (
            <button key={banner.id} type="button" className={`${styles.bannerRow} ${selected?.id === banner.id ? styles.selected : ''}`} onClick={() => openBanner(banner)}>
              <span className={styles.thumb}>{banner.imageUrl ? <img src={banner.imageUrl} alt="" /> : <Image size={16} />}</span>
              <span>
                <strong>{banner.title}</strong>
                <small>{banner.placement} · {banner.status}</small>
              </span>
            </button>
          ))}
          {!banners.length ? <p className={styles.empty}>{loading ? 'Loading...' : 'No banners yet.'}</p> : null}
        </aside>

        <form className={styles.formPanel} onSubmit={save}>
          <div className={styles.panelHeader}>{selected ? 'Edit banner' : 'Create banner'}</div>
          <section className={styles.formSection}>
            <div className={styles.inlineFields}>
              <label>Title<input value={form.title} onChange={(event) => updateField('title', event.target.value)} required /></label>
              <label>
                Placement
                <input list="banner-placements" value={form.placement} onChange={(event) => updateField('placement', normalizePlacement(event.target.value))} required />
                <datalist id="banner-placements">{placements.map((placement) => <option key={placement} value={placement} />)}</datalist>
              </label>
            </div>
            <div className={styles.inlineFields}>
              <label>Subtitle<input value={form.subtitle || ''} onChange={(event) => updateField('subtitle', event.target.value)} /></label>
              <label>Sort order<input type="number" value={form.sortOrder} onChange={(event) => updateField('sortOrder', event.target.value)} /></label>
            </div>
            <label>Description<textarea rows={3} value={form.description || ''} onChange={(event) => updateField('description', event.target.value)} /></label>
          </section>

          <section className={styles.formSection}>
            <div className={styles.inlineFields}>
              <ImageUploadField label="Desktop image" value={form.imageUrl || ''} onChange={(url) => updateField('imageUrl', url)} folder="banners" />
              <ImageUploadField label="Mobile image" value={form.mobileImageUrl || ''} onChange={(url) => updateField('mobileImageUrl', url)} folder="banners" />
            </div>
            <label>Video URL<input value={form.videoUrl || ''} onChange={(event) => updateField('videoUrl', event.target.value)} /></label>
          </section>

          <section className={styles.formSection}>
            <div className={styles.inlineFields}>
              <label>
                Link type
                <select value={form.linkType} onChange={(event) => updateField('linkType', event.target.value)}>
                  <option value="NONE">None</option>
                  <option value="URL">URL</option>
                  <option value="CATEGORY">Category</option>
                  <option value="PRODUCT">Product</option>
                </select>
              </label>
              <label>Link value<input value={form.linkValue || ''} onChange={(event) => updateField('linkValue', event.target.value)} /></label>
            </div>
            <CtaFields title="Primary CTA" value={form.primaryCta} onChange={(value) => updateField('primaryCta', value)} />
            <CtaFields title="Secondary CTA" value={form.secondaryCta} onChange={(value) => updateField('secondaryCta', value)} />
          </section>

          <section className={styles.formSection}>
            <div className={styles.inlineFields}>
              <label>
                Status
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label>Starts at<input type="datetime-local" value={form.startsAt} onChange={(event) => updateField('startsAt', event.target.value)} /></label>
              <label>Ends at<input type="datetime-local" value={form.endsAt} onChange={(event) => updateField('endsAt', event.target.value)} /></label>
            </div>
          </section>

          <div className={styles.actions}>
            {selected ? <Button type="button" variant="danger" onClick={remove} disabled={saving}><Trash2 size={16} /> Delete</Button> : null}
            <Button type="submit" loading={saving}><Save size={16} /> Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BannerManagementPage;
