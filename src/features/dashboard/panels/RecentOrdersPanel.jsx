import Badge from '@components/ui/Badge/Badge';
import styles from './Panels.module.scss';

// Sample data — replace with GET /admin/orders?sort=-created_at&limit=5
const ORDERS = [
  { no: '#ORD-02541', customer: 'John Smith', amount: '$125.99', status: 'Completed', tone: 'good' },
  { no: '#ORD-02540', customer: 'Maria Garcia', amount: '$89.00', status: 'Processing', tone: 'warning' },
  { no: '#ORD-02539', customer: 'Alex Johnson', amount: '$159.50', status: 'Completed', tone: 'good' },
  { no: '#ORD-02538', customer: 'Sarah Williams', amount: '$239.00', status: 'Shipped', tone: 'neutral' },
  { no: '#ORD-02537', customer: 'David Brown', amount: '$75.25', status: 'Pending', tone: 'serious' },
];

const RecentOrdersPanel = () => (
  <div className={styles.card}>
    <div className={styles.header}>
      <h3>Recent Orders</h3>
      <a href="/orders">View All</a>
    </div>
    <ul className={styles.list}>
      {ORDERS.map((order) => (
        <li key={order.no} className={styles.row}>
          <div className={styles.rowMain}>
            <span className={styles.rowTitle}>{order.no}</span>
            <span className={styles.rowSubtitle}>{order.customer}</span>
          </div>
          <span className={styles.rowAmount}>{order.amount}</span>
          <Badge tone={order.tone}>{order.status}</Badge>
        </li>
      ))}
    </ul>
  </div>
);

export default RecentOrdersPanel;
