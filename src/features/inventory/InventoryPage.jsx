import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import Badge from '@components/ui/Badge/Badge';
import Button from '@components/ui/Button/Button';
import DataTable from '@components/ui/DataTable/DataTable';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import StatCard from '@components/ui/StatCard/StatCard';
import { PERMISSIONS } from '@constants/permissions';
import { usePermission } from '@hooks/usePermission';
import { inventoryApi } from './inventory.api';
import styles from './InventoryPage.module.scss';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateTime = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

const STOCK_LABEL = {
  all: 'All stock',
  available: 'Available',
  low: 'Low stock',
  out: 'Out of stock',
  tracked: 'Tracked',
  untracked: 'Not tracked',
};

const SelectControl = ({ label, value, onChange, children }) => (
  <label className={styles.selectControl}>
    <span className={styles.srOnly}>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
      {children}
    </select>
    <ChevronDown size={15} />
  </label>
);

const StockBadge = ({ item }) => {
  if (!item.stockTrackingEnabled) return <Badge tone="neutral">Not tracked</Badge>;
  if (item.isOutOfStock) return <Badge tone="critical">Out of stock</Badge>;
  if (item.isLowStock) return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="good">Available</Badge>;
};

const ProductCell = ({ item }) => (
  <div className={styles.productCell}>
    <div className={styles.thumb}>
      {item.image ? <img src={item.image} alt="" /> : <Boxes size={18} />}
    </div>
    <div>
      <strong>{item.productName}</strong>
      <span>{item.variantName || 'Default'} - {item.sku}</span>
      {item.categoryNames?.length ? <em>{item.categoryNames.slice(0, 2).join(', ')}</em> : null}
    </div>
  </div>
);

const InventoryPage = () => {
  const { can } = usePermission();
  const canAdjust = can(PERMISSIONS.INVENTORY_ADJUST);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalSkus: 0,
    availableUnits: 0,
    reservedUnits: 0,
    lowStock: 0,
    outOfStock: 0,
    untracked: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', stock: 'all', status: 'all' });
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [adjustDraft, setAdjustDraft] = useState({ direction: 'add', quantity: 1, reason: '' });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (next = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: next.page ?? pagination.page,
        limit: pagination.limit,
        search: next.search ?? filters.search,
        stock: next.stock ?? filters.stock,
        status: next.status ?? filters.status,
      };
      const data = await inventoryApi.list(params);
      setItems(data.items || []);
      setSummary(data.summary || summary);
      setPagination(data.pagination || pagination);
      setDrafts({});
      setSelectedId((current) => (data.items || []).some((item) => item.id === current) ? current : null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      setFilters((current) => (current.search === nextSearch ? current : { ...current, search: nextSearch }));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!selectedId) {
      setAdjustments([]);
      return;
    }

    let active = true;
    setAdjustmentsLoading(true);
    inventoryApi.adjustments(selectedId)
      .then((data) => {
        if (active) setAdjustments(data.adjustments || []);
      })
      .catch(() => {
        if (active) setAdjustments([]);
      })
      .finally(() => {
        if (active) setAdjustmentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, notice]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  const patchRow = (item) => {
    setItems((current) => current.map((row) => (row.id === item.id ? item : row)));
    setSelectedId(item.id);
  };

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        stockQuantity: current[id]?.stockQuantity ?? items.find((item) => item.id === id)?.stockQuantity ?? 0,
        lowStockThreshold: current[id]?.lowStockThreshold ?? items.find((item) => item.id === id)?.lowStockThreshold ?? 0,
        ...current[id],
        [field]: value,
      },
    }));
  };

  const saveRow = async (item) => {
    const draft = drafts[item.id];
    if (!draft) return;
    setSavingId(item.id);
    setError('');
    setNotice('');
    try {
      const data = await inventoryApi.update(item.id, {
        stockQuantity: Number(draft.stockQuantity),
        lowStockThreshold: Number(draft.lowStockThreshold),
      });
      patchRow(data.item);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setNotice(`${data.item.sku} updated.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update inventory.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleTracking = async (item) => {
    setSavingId(item.id);
    setError('');
    setNotice('');
    try {
      const data = await inventoryApi.update(item.id, { stockTrackingEnabled: !item.stockTrackingEnabled });
      patchRow(data.item);
      setNotice(`${data.item.sku} ${data.item.stockTrackingEnabled ? 'is now tracked' : 'is no longer tracked'}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update tracking.');
    } finally {
      setSavingId(null);
    }
  };

  const adjustSelected = async (event) => {
    event.preventDefault();
    if (!selectedItem) return;
    const quantity = Math.max(Number(adjustDraft.quantity) || 0, 0);
    if (!quantity) {
      setError('Enter an adjustment quantity.');
      return;
    }
    const delta = adjustDraft.direction === 'remove' ? -quantity : quantity;
    setSavingId(selectedItem.id);
    setError('');
    setNotice('');
    try {
      const data = await inventoryApi.adjust(selectedItem.id, { delta, reason: adjustDraft.reason || null });
      patchRow(data.item);
      setAdjustDraft({ direction: 'add', quantity: 1, reason: '' });
      setNotice(`${data.item.sku} adjusted by ${delta > 0 ? '+' : ''}${delta}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to adjust stock.');
    } finally {
      setSavingId(null);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setFilters((current) => (current.search === nextSearch ? current : { ...current, search: nextSearch }));
  };

  const setPage = (page) => load({ page });

  const columns = [
    {
      key: 'product',
      header: 'Product / SKU',
      width: '36%',
      render: (item) => <ProductCell item={item} />,
    },
    { key: 'status', header: 'Stock status', width: '130px', render: (item) => <StockBadge item={item} /> },
    {
      key: 'available',
      header: 'Available',
      width: '90px',
      align: 'right',
      render: (item) => <strong className={item.isOutOfStock ? styles.criticalText : ''}>{item.stockTrackingEnabled ? item.availableQuantity : 'Open'}</strong>,
    },
    { key: 'reserved', header: 'Committed', width: '92px', align: 'right', render: (item) => item.reservedQuantity },
    {
      key: 'stock',
      header: 'On hand',
      width: '112px',
      render: (item) => {
        const value = drafts[item.id]?.stockQuantity ?? item.stockQuantity;
        return (
          <input
            className={styles.numberInput}
            type="number"
            min="0"
            value={value}
            disabled={!canAdjust || savingId === item.id}
            onChange={(event) => updateDraft(item.id, 'stockQuantity', event.target.value)}
          />
        );
      },
    },
    {
      key: 'threshold',
      header: 'Low at',
      width: '100px',
      render: (item) => {
        const value = drafts[item.id]?.lowStockThreshold ?? item.lowStockThreshold;
        return (
          <input
            className={styles.numberInput}
            type="number"
            min="0"
            value={value}
            disabled={!canAdjust || savingId === item.id}
            onChange={(event) => updateDraft(item.id, 'lowStockThreshold', event.target.value)}
          />
        );
      },
    },
    { key: 'price', header: 'Price', width: '90px', align: 'right', render: (item) => money.format(item.sellingPrice) },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (item) => (
        <div className={styles.actionsCell}>
          <button type="button" onClick={() => setSelectedId(item.id)}>Adjust</button>
          {drafts[item.id] ? <button type="button" onClick={() => saveRow(item)} disabled={savingId === item.id}>Save</button> : null}
        </div>
      ),
    },
  ];

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Inventory"
        icon={Boxes}
        title="Stock"
        description="Maintain sellable stock, committed quantities, and low-stock rules across every product variant."
        actions={<Button variant="secondary" onClick={() => load()} disabled={loading}><RefreshCw size={16} /> Refresh</Button>}
      />

      <div className={styles.metricGrid}>
        <StatCard icon={PackageCheck} label="Available Units" value={summary.availableUnits} iconTone="mint" />
        <StatCard icon={Boxes} label="Total SKUs" value={summary.totalSkus} iconTone="primary" />
        <StatCard icon={SlidersHorizontal} label="Committed" value={summary.reservedUnits} iconTone="sky" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={summary.lowStock} iconTone="amber" />
        <StatCard icon={XCircle} label="Out of Stock" value={summary.outOfStock} iconTone="rose" />
      </div>

      <section className={styles.toolbar}>
        <form className={styles.searchBox} onSubmit={submitSearch}>
          <Search size={16} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search product, SKU, or slug..."
          />
        </form>
        <SelectControl label="Stock filter" value={filters.stock} onChange={(value) => setFilters((current) => ({ ...current, stock: value }))}>
          {Object.entries(STOCK_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectControl>
        <SelectControl label="Variant status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </SelectControl>
      </section>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

      <div className={styles.contentGrid}>
        <DataTable
          rows={items}
          columns={columns}
          loading={loading}
          emptyText="No SKUs match the current filters."
          footer={(
            <div className={styles.pager}>
              <span>Page {pagination.page} of {pagination.totalPages} - {pagination.total} SKUs</span>
              <div className={styles.pagerButtons}>
                <button type="button" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        />

        <aside className={styles.sidePanel}>
          {selectedItem ? (
            <>
              <div className={styles.sideHeader}>
                <ProductCell item={selectedItem} />
                <StockBadge item={selectedItem} />
              </div>
              <dl className={styles.stockFacts}>
                <dt>On hand</dt>
                <dd>{selectedItem.stockQuantity}</dd>
                <dt>Committed</dt>
                <dd>{selectedItem.reservedQuantity}</dd>
                <dt>Available</dt>
                <dd>{selectedItem.stockTrackingEnabled ? selectedItem.availableQuantity : 'Not tracked'}</dd>
                <dt>Low-stock alert</dt>
                <dd>{selectedItem.lowStockThreshold}</dd>
              </dl>

              <form className={styles.adjustForm} onSubmit={adjustSelected}>
                <h3>Quick Adjustment</h3>
                <div className={styles.segmented}>
                  <button
                    type="button"
                    className={adjustDraft.direction === 'add' ? styles.activeSegment : ''}
                    onClick={() => setAdjustDraft((current) => ({ ...current, direction: 'add' }))}
                  >
                    <Plus size={14} /> Add
                  </button>
                  <button
                    type="button"
                    className={adjustDraft.direction === 'remove' ? styles.activeSegment : ''}
                    onClick={() => setAdjustDraft((current) => ({ ...current, direction: 'remove' }))}
                  >
                    <Minus size={14} /> Remove
                  </button>
                </div>
                <label className={styles.field}>
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="1"
                    value={adjustDraft.quantity}
                    onChange={(event) => setAdjustDraft((current) => ({ ...current, quantity: event.target.value }))}
                    disabled={!canAdjust}
                  />
                </label>
                <label className={styles.field}>
                  <span>Reason</span>
                  <textarea
                    rows={3}
                    value={adjustDraft.reason}
                    onChange={(event) => setAdjustDraft((current) => ({ ...current, reason: event.target.value }))}
                    placeholder="Restock, damage, cycle count..."
                    disabled={!canAdjust}
                  />
                </label>
                <Button type="submit" loading={savingId === selectedItem.id} disabled={!canAdjust}>
                  <Save size={16} /> Save Adjustment
                </Button>
              </form>

              <Button variant="secondary" onClick={() => toggleTracking(selectedItem)} loading={savingId === selectedItem.id} disabled={!canAdjust}>
                {selectedItem.stockTrackingEnabled ? 'Stop tracking this SKU' : 'Track this SKU'}
              </Button>

              <section className={styles.history}>
                <h3>Recent Movements</h3>
                {adjustmentsLoading ? (
                  <p>Loading...</p>
                ) : adjustments.length ? (
                  <ul>
                    {adjustments.map((entry) => (
                      <li key={entry.id}>
                        <span className={entry.changeQuantity > 0 ? styles.positiveMove : styles.negativeMove}>
                          {entry.changeQuantity > 0 ? '+' : ''}{entry.changeQuantity}
                        </span>
                        <div>
                          <strong>{entry.previousQuantity} {'->'} {entry.newQuantity}</strong>
                          <small>{entry.reason || 'Manual adjustment'} - {dateTime(entry.createdAt)}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No manual adjustments yet.</p>
                )}
              </section>
            </>
          ) : (
            <div className={styles.emptyPanel}>
              <CheckCircle2 size={24} />
              <strong>Select a SKU</strong>
              <span>Use the table actions to adjust stock or review committed units.</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default InventoryPage;
