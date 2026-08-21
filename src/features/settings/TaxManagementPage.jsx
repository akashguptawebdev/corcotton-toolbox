import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Edit3, Plus, Receipt, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import { catalogApi } from '@features/catalog/catalog.api';
import { usePermission } from '@hooks/usePermission';
import { useEditGuard } from '@hooks/useEditGuard';
import { PERMISSIONS } from '@constants/permissions';
import { storeSettingsApi } from './storeSettings.api';
import catalogStyles from '@features/catalog/CatalogPage.module.scss';
import styles from './TaxManagementPage.module.scss';

const styleFor = (key) => catalogStyles[key] || styles[key];

const emptyForm = {
  hsnCode: '',
  name: '',
  description: '',
  gstRate: '',
  isTaxable: true,
  effectiveFrom: '',
  effectiveTo: '',
};

const emptyRateDraft = { taxComponent: 'CGST', ratePercent: '' };
const TAX_COMPONENTS = ['CGST', 'SGST', 'IGST', 'CESS'];

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

function TaxManagementPage() {
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.PRODUCT_CREATE);
  const { canEdit, isEditing, startEdit, stopEdit, setIsEditing } = useEditGuard(PERMISSIONS.PRODUCT_UPDATE);
  const [taxCategories, setTaxCategories] = useState([]);
  const [view, setView] = useState('list');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [taxableFilter, setTaxableFilter] = useState('ALL');
  const [rateDrafts, setRateDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [calcCategoryId, setCalcCategoryId] = useState('');
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcCustomerState, setCalcCustomerState] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');

  // Read-only here — the store's registered state is edited under Settings → General,
  // not from Tax Management. Only surfaced so the calculator can warn if it's unset.
  const [storeState, setStoreState] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return taxCategories.filter((item) => {
      const text = [item.hsnCode, item.name, item.description].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesTaxable = taxableFilter === 'ALL' || (taxableFilter === 'TAXABLE' ? item.isTaxable : !item.isTaxable);
      return matchesSearch && matchesTaxable;
    });
  }, [taxCategories, search, taxableFilter]);

  const metrics = useMemo(() => {
    const taxable = taxCategories.filter((item) => item.isTaxable).length;
    const avgRate = taxCategories.length
      ? Math.round((taxCategories.reduce((sum, item) => sum + Number(item.gstRate || 0), 0) / taxCategories.length) * 100) / 100
      : 0;
    return { total: taxCategories.length, taxable, avgRate };
  }, [taxCategories]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await catalogApi.taxCategories.list({ withRates: true });
      setTaxCategories(data.taxCategories || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load tax categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    storeSettingsApi.get().then((data) => setStoreState(data.storeSettings?.state || '')).catch(() => setStoreState(''));
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const startCreate = () => {
    if (!canCreate) return;
    setForm(emptyForm);
    setEditing(null);
    setIsEditing(true); // a blank new record has nothing to "view" — always editable
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

  const editItem = (item) => {
    setError('');
    setNotice('');
    setEditing(item);
    setForm({
      hsnCode: item.hsnCode || '',
      name: item.name || '',
      description: item.description || '',
      gstRate: item.gstRate ?? '',
      isTaxable: item.isTaxable ?? true,
      effectiveFrom: toDateInput(item.effectiveFrom),
      effectiveTo: toDateInput(item.effectiveTo),
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
        ...form,
        gstRate: Number(form.gstRate) || 0,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      };
      if (editing) await catalogApi.taxCategories.update(editing.id, payload);
      else await catalogApi.taxCategories.create(payload);
      setNotice(`Tax category ${editing ? 'updated' : 'created'}.`);
      closeForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save tax category');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event, item) => {
    event.stopPropagation();
    if (!window.confirm(`Delete tax category ${item.hsnCode}?`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await catalogApi.taxCategories.remove(item.id);
      setNotice('Tax category deleted.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete tax category');
    } finally {
      setSaving(false);
    }
  };

  const updateRateDraft = (categoryId, patch) =>
    setRateDrafts((current) => ({ ...current, [categoryId]: { ...emptyRateDraft, ...current[categoryId], ...patch } }));

  const addRate = async (categoryId) => {
    const draft = rateDrafts[categoryId] || emptyRateDraft;
    if (!draft.ratePercent) return;
    setSaving(true);
    setError('');
    try {
      await catalogApi.taxCategories.createRate(categoryId, { taxComponent: draft.taxComponent, ratePercent: Number(draft.ratePercent) });
      setRateDrafts((current) => ({ ...current, [categoryId]: emptyRateDraft }));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to add tax rate');
    } finally {
      setSaving(false);
    }
  };

  const removeRate = async (rateId) => {
    setSaving(true);
    setError('');
    try {
      await catalogApi.taxCategories.removeRate(rateId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to remove tax rate');
    } finally {
      setSaving(false);
    }
  };

  const runCalculator = async () => {
    if (!calcCategoryId || !calcCustomerState.trim()) return;
    setCalculating(true);
    setCalcError('');
    setCalcResult(null);
    try {
      const data = await catalogApi.taxCategories.calculate(calcCategoryId, { amount: Number(calcAmount) || 0, customerState: calcCustomerState.trim() });
      setCalcResult(data);
    } catch (err) {
      setCalcError(err.response?.data?.message || err.message || 'Unable to calculate tax');
    } finally {
      setCalculating(false);
    }
  };

  const renderForm = () => {
    const fieldsDisabled = editing ? !isEditing : false;
    return (
      <form className={styleFor('editor')} onSubmit={submit}>
        <div className={styleFor('editorHeader')}>
          <div>
            <span>{editing ? (isEditing ? 'Editing' : 'Viewing') : 'Creating'}</span>
            <h2>{editing ? `${editing.hsnCode} — ${editing.name || 'Tax Category'}` : 'New Tax Category'}</h2>
          </div>
          <button type="button" onClick={closeForm}>
            <X size={16} /> Close
          </button>
        </div>

        {editing && !canEdit ? <div className={styleFor('notice')}>You have read-only access to tax categories.</div> : null}

        <fieldset disabled={fieldsDisabled} className={styles.fieldset}>
          <section className={styleFor('editorSection')}>
            <h3>HSN & GST</h3>
            <div className={styleFor('twoCol')}>
              <label>HSN / SAC Code<input value={form.hsnCode} onChange={(event) => updateField('hsnCode', event.target.value)} placeholder="e.g. 61091000" required /></label>
              <label>GST Rate (%)<input type="number" min="0" step="0.01" value={form.gstRate} onChange={(event) => updateField('gstRate', event.target.value)} placeholder="e.g. 18" required /></label>
            </div>
            <label>Name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Cotton T-Shirts" /></label>
            <label>Description<textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={3} /></label>
            <div className={styleFor('twoCol')}>
              <label>Effective From<input type="date" value={form.effectiveFrom} onChange={(event) => updateField('effectiveFrom', event.target.value)} /></label>
              <label>Effective To<input type="date" value={form.effectiveTo} onChange={(event) => updateField('effectiveTo', event.target.value)} /></label>
            </div>
            <label className={styleFor('inlineCheck')}>
              <input type="checkbox" checked={Boolean(form.isTaxable)} onChange={(event) => updateField('isTaxable', event.target.checked)} /> Taxable
            </label>
          </section>
        </fieldset>

        {editing && !isEditing ? (
          <Button type="button" onClick={startEdit} disabled={!canEdit} title={!canEdit ? "You don't have permission to edit tax categories" : undefined}>
            <Edit3 size={16} /> Edit
          </Button>
        ) : (
          <div className={styles.formActions}>
            {editing ? <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button> : null}
            <button className={styleFor('primaryButton')} type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving' : editing ? 'Save Changes' : 'Create Tax Category'}
            </button>
          </div>
        )}
      </form>
    );
  };

  return (
    <section className={styleFor('page')}>
      <PageHeader
        eyebrow="Settings / Tax Management"
        icon={Receipt}
        title="Tax Management"
        description="Define HSN/SAC codes, GST rates, and CGST/SGST/IGST/CESS breakdowns used across product creation and order tax calculation."
        meta={`${filtered.length} visible`}
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>
            <Button type="button" onClick={startCreate} disabled={!canCreate} title={!canCreate ? "You don't have permission to create tax categories" : undefined}>
              <Plus size={16} /> New Tax Category
            </Button>
          </>
        )}
      />

      {error ? <div className={styleFor('alert')}>{error}</div> : null}
      {notice ? <div className={styleFor('notice')}>{notice}</div> : null}

      {view === 'form' ? renderForm() : (
        <main className={styleFor('listShell')}>
          {storeState === '' ? (
            <div className={styleFor('alert')}>
              No store state configured — CGST+SGST vs IGST can't be resolved yet.{' '}
              <Link to="/settings/general">Set it under Settings → General.</Link>
            </div>
          ) : storeState ? (
            <div className={styleFor('notice')}>
              Registered store state: <strong>{storeState}</strong> — <Link to="/settings/general">change in Settings</Link>
            </div>
          ) : null}

          <section className={styleFor('summary')}>
            <div><span>Total</span><strong>{metrics.total}</strong></div>
            <div><span>Taxable</span><strong>{metrics.taxable}</strong></div>
            <div><span>Avg GST%</span><strong>{metrics.avgRate}%</strong></div>
            <div><span>Visible List</span><strong>{filtered.length}</strong></div>
          </section>

          <section className={styles.calculatorCard}>
            <h3><Calculator size={16} /> GST Calculator</h3>
            <p>Pick a tax category and the customer's delivery state — CGST+SGST vs IGST is resolved automatically against the store's state above.</p>
            <div className={styles.calculatorRow}>
              <select value={calcCategoryId} onChange={(event) => { setCalcCategoryId(event.target.value); setCalcResult(null); }}>
                <option value="">Select HSN / tax category</option>
                {taxCategories.map((item) => (
                  <option key={item.id} value={item.id}>{item.hsnCode} — {item.name || 'Untitled'} ({item.gstRate}%)</option>
                ))}
              </select>
              <input type="number" min="0" value={calcAmount} onChange={(event) => setCalcAmount(event.target.value)} placeholder="Taxable amount" />
              <input value={calcCustomerState} onChange={(event) => setCalcCustomerState(event.target.value)} placeholder="Customer state (e.g. Maharashtra)" />
              <Button type="button" onClick={runCalculator} disabled={!calcCategoryId || !calcCustomerState.trim() || calculating}>
                {calculating ? 'Calculating…' : 'Calculate'}
              </Button>
            </div>
            {calcError ? <div className={styleFor('alert')}>{calcError}</div> : null}
            {calcResult ? (
              <div className={styles.calculatorResult}>
                <div className={styles.calculatorMeta}>
                  <span>{calcResult.sellerState} → {calcResult.customerState}</span>
                  <strong>{calcResult.interState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}</strong>
                </div>
                {calcResult.components.map((component) => (
                  <div key={component.component}>
                    <span>{component.component} ({component.ratePercent}%)</span>
                    <strong>₹{component.amount}</strong>
                  </div>
                ))}
                <div className={styles.calculatorTotal}>
                  <span>Total Tax</span><strong>₹{calcResult.taxAmount}</strong>
                </div>
                <div className={styles.calculatorTotal}>
                  <span>Amount + Tax</span><strong>₹{calcResult.totalAmount}</strong>
                </div>
              </div>
            ) : null}
          </section>

          <section className={styleFor('toolbar')}>
            <div className={styleFor('searchBox')}>
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search HSN code or name" />
            </div>
            <select value={taxableFilter} onChange={(event) => setTaxableFilter(event.target.value)}>
              <option value="ALL">All</option>
              <option value="TAXABLE">Taxable</option>
              <option value="EXEMPT">Exempt</option>
            </select>
          </section>

          <section className={styleFor('cardList')}>
            {loading ? <div className={styleFor('emptyState')}>Loading...</div> : null}
            {!loading && !filtered.length ? <div className={styleFor('emptyState')}>No tax categories found.</div> : null}
            {filtered.map((item) => {
              const draft = rateDrafts[item.id] || emptyRateDraft;
              return (
                <article key={item.id} className={styleFor('recordCard')} onClick={() => editItem(item)}>
                  <div className={styleFor('recordMedia')}><Receipt size={20} /></div>
                  <div className={styleFor('recordMain')}>
                    <div className={styleFor('recordTitle')}>
                      <strong>{item.hsnCode} — {item.name || 'Untitled'}</strong>
                      <mark className={`${styleFor('status')} ${item.isTaxable ? styleFor('statusActive') : styleFor('statusInactive')}`}>
                        {item.isTaxable ? `${item.gstRate}% GST` : 'Exempt'}
                      </mark>
                    </div>
                    <p>{item.description || 'No description'}</p>

                    {item.rates?.length ? (
                      <div className={styleFor('valueChips')}>
                        {item.rates.map((rate) => (
                          <span key={rate.id}>
                            {rate.taxComponent} {rate.ratePercent}%
                            <button type="button" onClick={(event) => { event.stopPropagation(); removeRate(rate.id); }}><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className={styleFor('valueBatch')} onClick={(event) => event.stopPropagation()}>
                      <select value={draft.taxComponent} onChange={(event) => updateRateDraft(item.id, { taxComponent: event.target.value })}>
                        {TAX_COMPONENTS.map((component) => <option key={component} value={component}>{component}</option>)}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate %"
                        value={draft.ratePercent}
                        onChange={(event) => updateRateDraft(item.id, { ratePercent: event.target.value })}
                      />
                      <button type="button" onClick={() => addRate(item.id)}><Plus size={14} /> Add Rate</button>
                    </div>
                  </div>
                  <div className={styleFor('recordActions')} onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => editItem(item)}><Edit3 size={16} /></button>
                    <button type="button" onClick={(event) => remove(event, item)}><Trash2 size={16} /></button>
                  </div>
                </article>
              );
            })}
          </section>
        </main>
      )}
    </section>
  );
}

export default TaxManagementPage;
