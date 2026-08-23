import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowDownRight,
  BriefcaseBusiness,
  Calendar,
  ChevronDown,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Button from '@components/ui/Button/Button';
import DataTable from '@components/ui/DataTable/DataTable';
import TablePagination from '@components/ui/TablePagination/TablePagination';
import Badge from '@components/ui/Badge/Badge';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Avatar from '@components/ui/Avatar/Avatar';
import { setReturnFilters } from './returnsSlice';
import styles from './ReturnsPage.module.scss';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const reasonLabels = {
  wrong_size: 'Wrong size',
  damaged_item: 'Damaged item',
  changed_mind: 'Changed mind',
  defective: 'Defective',
  wrong_item_sent: 'Wrong item sent',
  late_delivery: 'Late delivery',
  quality_issue: 'Quality issue',
};

const statusLabels = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  in_transit: 'In Transit',
  refunded: 'Refunded',
  rejected: 'Rejected',
  completed: 'Completed',
};

const resolutionLabels = {
  refund: 'Refund',
  exchange: 'Exchange',
  store_credit: 'Store Credit',
  none: '-',
};

const statusTones = {
  pending_review: 'warning',
  approved: 'good',
  in_transit: 'neutral',
  refunded: 'neutral',
  rejected: 'critical',
  completed: 'good',
};

const resolutionTones = {
  refund: 'neutral',
  exchange: 'neutral',
  store_credit: 'warning',
};

const statusClasses = {
  in_transit: styles.blueBadge,
  refunded: styles.violetBadge,
};

const resolutionClasses = {
  refund: styles.violetBadge,
  exchange: styles.violetBadge,
  store_credit: styles.orangeBadge,
};

const matchesFilter = (item, filters) => {
  const query = filters.query.trim().toLowerCase();
  const haystack = [
    item.id,
    item.orderId,
    item.customer.name,
    item.customer.email,
    reasonLabels[item.reason],
    statusLabels[item.status],
    resolutionLabels[item.resolution],
  ].join(' ').toLowerCase();

  return (
    (!query || haystack.includes(query)) &&
    (filters.status === 'all' || item.status === filters.status) &&
    (filters.reason === 'all' || item.reason === filters.reason) &&
    (filters.resolution === 'all' || item.resolution === filters.resolution)
  );
};

const FilterSelect = ({ value, onChange, children, label }) => (
  <label className={styles.selectControl}>
    <span className={styles.srOnly}>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
      {children}
    </select>
    <ChevronDown size={15} />
  </label>
);

const ReturnsPage = () => {
  const dispatch = useDispatch();
  const { returns, filters, pagination, status } = useSelector((state) => state.returns);
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredReturns = useMemo(
    () => returns.filter((item) => matchesFilter(item, filters)),
    [returns, filters]
  );

  const columns = useMemo(() => [
    {
      key: 'id',
      header: 'Return ID',
      width: '96px',
      render: (item) => <span className={styles.linkText}>#{item.id}</span>,
    },
    {
      key: 'orderId',
      header: 'Order',
      width: '86px',
      render: (item) => <span className={styles.linkText}>#{item.orderId}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      width: '250px',
      render: (item) => (
        <div className={styles.customerCell}>
          <Avatar name={item.customer.name} size={34} />
          <div>
            <strong>{item.customer.name}</strong>
            <span>{item.customer.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: <span className={styles.headerWithIcon}>Date <ArrowDownRight size={13} /></span>,
      width: '126px',
      render: (item) => (
        <div className={styles.dateCell}>
          <strong>{item.date}</strong>
          <span>{item.time}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      width: '84px',
      render: (item) => <span className={styles.itemPill}>{item.items} {item.items === 1 ? 'item' : 'items'}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      width: '142px',
      render: (item) => <span className={styles.reasonText}>{reasonLabels[item.reason]}</span>,
    },
    {
      key: 'refund',
      header: 'Refund',
      width: '106px',
      render: (item) => <strong className={styles.refundCell}>{currency.format(item.refund)}</strong>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '142px',
      render: (item) => <Badge tone={statusTones[item.status]} className={statusClasses[item.status]}>{statusLabels[item.status]}</Badge>,
    },
    {
      key: 'resolution',
      header: 'Resolution',
      width: '124px',
      render: (item) => (
        item.resolution === 'none'
          ? <span className={styles.emptyResolution}>-</span>
          : <Badge tone={resolutionTones[item.resolution]} className={resolutionClasses[item.resolution]}>{resolutionLabels[item.resolution]}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '92px',
      render: () => (
        <div className={styles.actionCell}>
          <button type="button" aria-label="View return"><Eye size={15} /></button>
          <button type="button" aria-label="More return actions"><MoreHorizontal size={15} /></button>
        </div>
      ),
    },
  ], []);

  const updateFilter = (key, value) => dispatch(setReturnFilters({ [key]: value }));

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        icon={BriefcaseBusiness}
        title="Returns"
        description="Review, approve, and resolve customer return requests."
        actions={(
          <>
            <Button type="button" variant="secondary" size="lg">
              <Download size={16} /> Export <ChevronDown size={15} />
            </Button>
            <Button type="button" variant="secondary" size="lg">
              <Filter size={16} /> More filters
            </Button>
            <Button type="button" size="lg">
              <Plus size={16} /> Create return
            </Button>
          </>
        )}
      />

      <section className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Search returns, customers, or order IDs..."
          />
        </div>
        <button type="button" className={styles.dateButton}>
          <Calendar size={16} /> {filters.dateRange} <ChevronDown size={15} />
        </button>
        <FilterSelect label="Return status" value={filters.status} onChange={(value) => updateFilter('status', value)}>
          <option value="all">All statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="in_transit">In Transit</option>
          <option value="refunded">Refunded</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </FilterSelect>
        <FilterSelect label="Return reason" value={filters.reason} onChange={(value) => updateFilter('reason', value)}>
          <option value="all">Return reason</option>
          <option value="wrong_size">Wrong size</option>
          <option value="damaged_item">Damaged item</option>
          <option value="changed_mind">Changed mind</option>
          <option value="defective">Defective</option>
          <option value="wrong_item_sent">Wrong item sent</option>
          <option value="late_delivery">Late delivery</option>
          <option value="quality_issue">Quality issue</option>
        </FilterSelect>
        <FilterSelect label="Resolution type" value={filters.resolution} onChange={(value) => updateFilter('resolution', value)}>
          <option value="all">Resolution type</option>
          <option value="refund">Refund</option>
          <option value="exchange">Exchange</option>
          <option value="store_credit">Store Credit</option>
          <option value="none">None</option>
        </FilterSelect>
        <Button type="button" variant="secondary" className={styles.filterButton}>
          <SlidersHorizontal size={16} /> Filters
        </Button>
      </section>

      <DataTable
        rows={filteredReturns}
        columns={columns}
        rowKey="id"
        loading={status === 'loading'}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyText="No return requests match the current filters."
        footer={(
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            visibleCount={filteredReturns.length}
            itemLabel="return requests"
            lastPage={11}
          />
        )}
      />
    </section>
  );
};

export default ReturnsPage;
