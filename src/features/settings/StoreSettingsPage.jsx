import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Edit3, Save, Store } from 'lucide-react';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Button from '@components/ui/Button/Button';
import ImageUploadField from '@components/forms/ImageUploadField/ImageUploadField';
import { fetchBranding } from '@app/brandingSlice';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { storeSettingsApi } from './storeSettings.api';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './StoreSettingsPage.module.scss';

const styleFor = (key) => catalogStyles[key] || styles[key];

const emptyForm = {
  businessName: '',
  displayName: '',
  logo: '',
  favicon: '',
  gstin: '',
  pan: '',
  cin: '',
  supportEmail: '',
  supportPhone: '',
  websiteUrl: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
};

function StoreSettingsPage() {
  const dispatch = useDispatch();
  const { canEdit, isEditing, startEdit, stopEdit } = useEditGuard(PERMISSIONS.SETTINGS_MANAGE);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const savedFormRef = useRef(emptyForm);

  // Display Name auto-copies from Business Name only until the admin edits Display Name
  // directly in this session — the moment they do, further Business Name edits stop
  // overwriting it. A saved settings row with its own display_name is treated as already
  // "touched" so re-opening this page doesn't start clobbering a deliberate choice.
  const displayNameTouched = useRef(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await storeSettingsApi.get();
      const settings = data.storeSettings || {};
      displayNameTouched.current = Boolean(settings.displayName);
      const nextForm = {
        businessName: settings.businessName || '',
        displayName: settings.displayName || settings.businessName || '',
        logo: settings.logo || '',
        favicon: settings.favicon || '',
        gstin: settings.gstin || '',
        pan: settings.pan || '',
        cin: settings.cin || '',
        supportEmail: settings.supportEmail || '',
        supportPhone: settings.supportPhone || '',
        websiteUrl: settings.websiteUrl || '',
        addressLine1: settings.addressLine1 || '',
        city: settings.city || '',
        state: settings.state || '',
        pincode: settings.pincode || '',
        country: settings.country || 'India',
        currency: settings.currency || 'INR',
        timezone: settings.timezone || 'Asia/Kolkata',
      };
      savedFormRef.current = nextForm;
      setForm(nextForm);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateBusinessName = (value) => {
    setForm((current) => ({
      ...current,
      businessName: value,
      displayName: displayNameTouched.current ? current.displayName : value,
    }));
  };

  const updateDisplayName = (value) => {
    displayNameTouched.current = true;
    updateField('displayName', value);
  };

  const cancel = () => {
    setForm(savedFormRef.current);
    displayNameTouched.current = Boolean(savedFormRef.current.displayName);
    setError('');
    stopEdit();
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await storeSettingsApi.update(form);
      setNotice('Store settings saved.');
      stopEdit();
      dispatch(fetchBranding());
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save store settings');
    } finally {
      setSaving(false);
    }
  };

  const fieldsDisabled = !isEditing;

  return (
    <section className={styleFor('page')}>
      <PageHeader
        eyebrow="Settings / General"
        icon={Store}
        title="Store Settings"
        description="Your business profile — name, branding, tax/registration numbers, address, and locale. Only the state is used elsewhere (GST calculation); everything else is optional."
        actions={
          !isEditing ? (
            <Button type="button" onClick={startEdit} disabled={loading || !canEdit} title={!canEdit ? "You don't have permission to edit store settings" : undefined}>
              <Edit3 size={16} /> Edit
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>Cancel</Button>
              <Button type="submit" form="store-settings-form" disabled={saving}><Save size={16} /> {saving ? 'Saving' : 'Save'}</Button>
            </>
          )
        }
      />

      {error ? <div className={styleFor('alert')}>{error}</div> : null}
      {notice ? <div className={styleFor('notice')}>{notice}</div> : null}
      {!canEdit ? <div className={styleFor('notice')}>You have read-only access to store settings.</div> : null}

      {loading ? (
        <div className={styleFor('emptyState')}>Loading...</div>
      ) : (
        <form id="store-settings-form" className={styleFor('editor')} onSubmit={submit}>
        <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
          <section className={styleFor('editorSection')}>
            <h3>Identity</h3>
            <div className={styleFor('twoCol')}>
              <label>
                Business Name
                <input value={form.businessName} onChange={(event) => updateBusinessName(event.target.value)} placeholder="Legal / registered name" />
              </label>
              <label>
                Display Name
                <input value={form.displayName} onChange={(event) => updateDisplayName(event.target.value)} placeholder="Shown across the toolbox" />
              </label>
            </div>
            <p className={styles.hint}>Display Name auto-fills from Business Name until you edit it yourself — it's what shows up as the app name everywhere (sidebar, browser tab).</p>
            <div className={styleFor('twoCol')}>
              <ImageUploadField label="Logo" value={form.logo} onChange={(url) => updateField('logo', url)} folder="store" />
              <ImageUploadField label="Favicon" value={form.favicon} onChange={(url) => updateField('favicon', url)} folder="store" />
            </div>
            <label>Website URL<input value={form.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} placeholder="https://..." /></label>
          </section>

          <section className={styleFor('editorSection')}>
            <h3>Registration & Tax</h3>
            <div className={styleFor('twoCol')}>
              <label>GSTIN<input value={form.gstin} onChange={(event) => updateField('gstin', event.target.value)} placeholder="22AAAAA0000A1Z5" /></label>
              <label>PAN<input value={form.pan} onChange={(event) => updateField('pan', event.target.value)} placeholder="AAAAA0000A" /></label>
            </div>
            <label>CIN<input value={form.cin} onChange={(event) => updateField('cin', event.target.value)} placeholder="Corporate identification number" /></label>
          </section>

          <section className={styleFor('editorSection')}>
            <h3>Registered Address</h3>
            <p className={styles.hint}>State is compared against each customer's delivery state to determine CGST+SGST vs IGST — see Tax Management's calculator.</p>
            <label>Address Line<input value={form.addressLine1} onChange={(event) => updateField('addressLine1', event.target.value)} /></label>
            <div className={styleFor('twoCol')}>
              <label>City<input value={form.city} onChange={(event) => updateField('city', event.target.value)} /></label>
              <label>State<input value={form.state} onChange={(event) => updateField('state', event.target.value)} placeholder="e.g. Karnataka" /></label>
            </div>
            <div className={styleFor('twoCol')}>
              <label>Pincode<input value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} /></label>
              <label>Country<input value={form.country} onChange={(event) => updateField('country', event.target.value)} /></label>
            </div>
          </section>

          <section className={styleFor('editorSection')}>
            <h3>Support & Locale</h3>
            <div className={styleFor('twoCol')}>
              <label>Support Email<input type="email" value={form.supportEmail} onChange={(event) => updateField('supportEmail', event.target.value)} placeholder="support@yourstore.com" /></label>
              <label>Support Phone<input value={form.supportPhone} onChange={(event) => updateField('supportPhone', event.target.value)} placeholder="+91 90000 00000" /></label>
            </div>
            <div className={styleFor('twoCol')}>
              <label>Currency<input value={form.currency} onChange={(event) => updateField('currency', event.target.value)} placeholder="INR" /></label>
              <label>Timezone<input value={form.timezone} onChange={(event) => updateField('timezone', event.target.value)} placeholder="Asia/Kolkata" /></label>
            </div>
          </section>
        </fieldset>
        </form>
      )}
    </section>
  );
}

export default StoreSettingsPage;
