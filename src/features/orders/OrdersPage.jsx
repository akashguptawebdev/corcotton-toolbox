import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Printer,
  Search,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import Button from '@components/ui/Button/Button';
import DataTable from '@components/ui/DataTable/DataTable';
import StatCard from '@components/ui/StatCard/StatCard';
import AnalyticsPanel from '@components/ui/AnalyticsPanel/AnalyticsPanel';
import Badge from '@components/ui/Badge/Badge';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import { ordersApi } from './orders.api';
import {
  fetchOrders,
  fetchOrderSummary,
  fetchOrderDetail,
  shipOrder,
  cancelOrder,
  setOrderFilters,
  setOrdersPage,
  selectOrder,
  clearSelectedOrder,
} from './ordersSlice';
import styles from './OrdersPage.module.scss';

// Real Delhivery-backed order states (backend/src/constants/orderEnums.js) — not
// Shopify's Shipped/Processing/Unfulfilled, which don't map to anything this system
// actually emits.
const STATUS_LABEL = {
  PENDING_PAYMENT: 'Pending Payment',
  CONFIRMED: 'Pending Shipment',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  NDR: 'NDR',
  RTO: 'RTO',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE = {
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'warning',
  SHIPPED: 'serious',
  IN_TRANSIT: 'serious',
  OUT_FOR_DELIVERY: 'serious',
  DELIVERED: 'good',
  NDR: 'critical',
  RTO: 'critical',
  CANCELLED: 'neutral',
};

const NDR_REASON_LABEL = {
  CUSTOMER_UNAVAILABLE: 'Customer unavailable',
  WRONG_ADDRESS: 'Wrong address',
  REFUSED: 'Refused by customer',
  OTHER: 'Other',
};

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateTime = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const FilterSelect = ({ value, onChange, children, label }) => (
  <label className={styles.selectControl}>
    <span className={styles.srOnly}>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
      {children}
    </select>
    <ChevronDown size={15} />
  </label>
);

const OrderDetail = ({ order, actionStatus, actionError, onBack, onShip, onCancel }) => {
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelError, setLabelError] = useState('');

  if (!order) return null;
  const canShip = order.status === 'CONFIRMED' && !order.waybillNumber;
  // Mirrors adminOrder.service.js's cancelOrder: anything short of a terminal state can
  // be cancelled — a shipped order routes through a real courier-side cancel there (only
  // works pre-pickup), a pre-shipment order cancels directly.
  const canCancel = !['DELIVERED', 'RTO', 'CANCELLED'].includes(order.status);

  // The physical label a pickup executive scans and affixes to the package — fetched
  // fresh every click (never cached client-side) so it's never stale. Opens in a new tab
  // rather than force-downloading, so the browser's own PDF viewer handles print/save.
  const handlePrintLabel = async () => {
    setLabelError('');
    setLabelLoading(true);
    try {
      const blob = await ordersApi.label(order.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setLabelError(err.response?.data?.message || 'Unable to fetch the shipment label');
    } finally {
      setLabelLoading(false);
    }
  };

  return (
    <section className={styles.detail}>
      <button type="button" className={styles.backButton} onClick={onBack}>
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div className={styles.detailHeader}>
        <div>
          <h2>{order.orderNumber}</h2>
          <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status] || order.status}</Badge>
        </div>
        <div className={styles.detailActions}>
          {canShip && (
            <Button onClick={onShip} loading={actionStatus === 'loading'}>
              <Truck size={16} /> Create Shipment
            </Button>
          )}
          {order.waybillNumber && (
            <Button variant="secondary" onClick={handlePrintLabel} loading={labelLoading}>
              <Printer size={16} /> Print Label
            </Button>
          )}
          {canCancel && (
            <Button variant="secondary" onClick={onCancel} loading={actionStatus === 'loading'}>
              <Ban size={16} /> Cancel Order
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className={styles.detailError}>{actionError}</p>}
      {labelError && <p className={styles.detailError}>{labelError}</p>}

      <div className={styles.detailGrid}>
        <div className={styles.detailCard}>
          <h3>Customer & Delivery</h3>
          <dl>
            <dt>Name</dt>
            <dd>{order.shippingAddress?.name || '—'}</dd>
            <dt>Phone</dt>
            <dd>{order.shippingAddress?.phone || '—'}</dd>
            <dt>Address</dt>
            <dd>
              {[order.shippingAddress?.addressLine1, order.shippingAddress?.addressLine2, order.shippingAddress?.city, order.shippingAddress?.state]
                .filter(Boolean)
                .join(', ')}
            </dd>
            <dt>Pincode</dt>
            <dd>{order.shippingAddress?.pincode || '—'}</dd>
          </dl>
        </div>

        <div className={styles.detailCard}>
          <h3>Payment & Shipment</h3>
          <dl>
            <dt>Payment mode</dt>
            <dd>{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid'}</dd>
            <dt>Total</dt>
            <dd>{money.format(order.totalAmount)}</dd>
            <dt>Waybill #</dt>
            <dd>{order.shipment?.waybillNumber || 'Not shipped yet'}</dd>
            {order.shipment?.courierStatus && (
              <>
                <dt>Courier status</dt>
                <dd>{order.shipment.courierStatus}</dd>
              </>
            )}
            {order.shipment?.ndrReason && (
              <>
                <dt>NDR reason</dt>
                <dd>{NDR_REASON_LABEL[order.shipment.ndrReason] || order.shipment.ndrReason}</dd>
              </>
            )}
            <dt>Last synced</dt>
            <dd>{dateTime(order.shipment?.lastSyncedAt)}</dd>
          </dl>
        </div>

        <div className={styles.detailCard}>
          <h3>Items</h3>
          <ul className={styles.itemList}>
            {(order.items || []).map((item) => (
              <li key={item.id}>
                <span>{item.name}{item.variantName ? ` — ${item.variantName}` : ''} × {item.quantity}</span>
                <strong>{money.format(item.totalAmount)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.detailCard}>
          {/* The per-order audit trail a "it says delivered but I never got it" dispute
              needs — a current-state pill alone can't answer that. */}
          <h3>Timeline</h3>
          {order.timeline?.length ? (
            <ul className={styles.timeline}>
              {order.timeline.map((event, index) => (
                <li key={index}>
                  <span className={styles.timelineDot} />
                  <div>
                    <strong>{STATUS_LABEL[event.toStatus] || event.toStatus}</strong>
                    <span>{dateTime(event.at)} · {event.source}{event.note ? ` — ${event.note}` : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNote}>No status changes recorded yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

const OrdersPage = () => {
  const dispatch = useDispatch();
  const {
    orders, filters, pagination, status, summary, selectedOrder, selectedOrderId, selectedOrderStatus,
    actionStatus, actionError,
  } = useSelector((state) => state.orders);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    dispatch(fetchOrderSummary());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch, filters, pagination.page]);

  useEffect(() => {
    if (selectedOrderId) dispatch(fetchOrderDetail(selectedOrderId));
  }, [dispatch, selectedOrderId]);

  const updateFilter = (key, value) => dispatch(setOrderFilters({ [key]: value }));

  const submitSearch = (event) => {
    event.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const handleShip = () => dispatch(shipOrder(selectedOrderId));
  const handleCancel = () => {
    const reason = window.prompt('Reason for cancelling this order (optional):') || null;
    dispatch(cancelOrder({ id: selectedOrderId, reason }));
  };

  const columns = [
    { key: 'order', header: 'Order ID', width: '120px', render: (o) => <span className={styles.orderLink}>{o.orderNumber}</span> },
    { key: 'customer', header: 'Customer', width: '180px', render: (o) => o.customer?.name || '—' },
    { key: 'pincode', header: 'Pincode', width: '90px', render: (o) => o.pincode || '—' },
    {
      key: 'payment',
      header: 'Payment mode',
      width: '110px',
      render: (o) => <Badge tone={o.paymentMethod === 'COD' ? 'warning' : 'good'}>{o.paymentMethod === 'COD' ? 'COD' : 'Prepaid'}</Badge>,
    },
    {
      key: 'status',
      header: 'Order status',
      width: '140px',
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status] || o.status}</Badge>,
    },
    { key: 'waybill', header: 'Waybill #', width: '130px', render: (o) => o.waybillNumber || '—' },
    { key: 'total', header: 'Total', width: '100px', render: (o) => <strong>{money.format(o.totalAmount)}</strong> },
    { key: 'synced', header: 'Last synced', width: '150px', render: (o) => dateTime(o.lastSyncedAt) },
    {
      key: 'actions',
      header: 'Actions',
      width: '110px',
      render: (o) => (
        <div className={styles.actionCell}>
          <button type="button" onClick={() => dispatch(selectOrder(o.id))}>View</button>
          {o.status === 'CONFIRMED' && !o.waybillNumber && (
            <button type="button" onClick={() => { dispatch(selectOrder(o.id)); dispatch(shipOrder(o.id)); }}>Ship</button>
          )}
        </div>
      ),
    },
  ];

  const { cards, cod, ndrReasons } = summary;

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        icon={BriefcaseBusiness}
        title="Orders"
        description="Track orders through Delhivery — from confirmation to delivery, NDR, or RTO."
      />

      {selectedOrderId ? (
        <OrderDetail
          order={selectedOrderStatus === 'loading' && !selectedOrder ? null : selectedOrder}
          actionStatus={actionStatus}
          actionError={actionError}
          onBack={() => dispatch(clearSelectedOrder())}
          onShip={handleShip}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <div className={styles.metricGrid}>
            <StatCard icon={ShoppingBag} label="Total Orders" value={cards.total} iconTone="primary" />
            <StatCard icon={Clock3} label="Pending Shipment" value={cards.pendingShipment} iconTone="amber" />
            <StatCard icon={Truck} label="In Transit" value={cards.inTransit} iconTone="sky" />
            <StatCard icon={AlertTriangle} label="NDR / RTO — Action Required" value={cards.actionRequired} iconTone="rose" />
            <StatCard icon={CheckCircle2} label="Delivered" value={cards.delivered} iconTone="mint" />
          </div>

          <section className={styles.toolbar}>
            <form className={styles.searchBox} onSubmit={submitSearch}>
              <Search size={16} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search order #, customer, or pincode..."
              />
            </form>
            <FilterSelect label="Order status" value={filters.status} onChange={(value) => updateFilter('status', value)}>
              <option value="all">All statuses</option>
              <option value="EXCEPTIONS">Exceptions (NDR + RTO)</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Payment mode" value={filters.paymentMethod} onChange={(value) => updateFilter('paymentMethod', value)}>
              <option value="all">All payment modes</option>
              <option value="COD">COD</option>
              <option value="ONLINE">Prepaid</option>
            </FilterSelect>
          </section>

          <div className={styles.contentGrid}>
            <DataTable
              rows={orders}
              columns={columns}
              rowKey="id"
              loading={status === 'loading'}
              emptyText="No orders match the current filters."
              footer={(
                <div className={styles.pager}>
                  <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders</span>
                  <div className={styles.pagerButtons}>
                    <button type="button" disabled={pagination.page <= 1} onClick={() => dispatch(setOrdersPage(pagination.page - 1))}>
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => dispatch(setOrdersPage(pagination.page + 1))}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            />

            <AnalyticsPanel
              title="Operations"
              sections={[
                {
                  title: 'COD — collected vs. outstanding',
                  items: [
                    { label: 'Outstanding (not yet delivered)', value: money.format(cod.outstanding), tone: 'warning' },
                    { label: 'Collected (delivered)', value: money.format(cod.collected), tone: 'good' },
                  ],
                },
                {
                  title: 'NDR reasons',
                  items: ndrReasons.length
                    ? ndrReasons.map((r) => ({ label: NDR_REASON_LABEL[r.reason] || r.reason, value: r.count }))
                    : [{ label: 'No open NDRs', value: '—' }],
                },
              ]}
            />
          </div>
        </>
      )}
    </section>
  );
};

export default OrdersPage;
