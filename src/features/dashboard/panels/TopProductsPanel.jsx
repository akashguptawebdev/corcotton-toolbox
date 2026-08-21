import { Package } from 'lucide-react';
import styles from './Panels.module.scss';

// Sample data — replace with GET /admin/reports/top-products
const PRODUCTS = [
  { name: 'Premium Cotton T-Shirt', sold: '582 sold', revenue: '$2,542.00' },
  { name: 'Cotton Hoodie', sold: '412 sold', revenue: '$1,932.00' },
  { name: 'Oversized Shirt', sold: '317 sold', revenue: '$1,421.00' },
  { name: 'Cotton Joggers', sold: '298 sold', revenue: '$1,203.00' },
  { name: 'Printed T-Shirt', sold: '265 sold', revenue: '$981.00' },
];

const TopProductsPanel = () => (
  <div className={styles.card}>
    <div className={styles.header}>
      <h3>Top Products</h3>
      <a href="/products">View All</a>
    </div>
    <ul className={styles.list}>
      {PRODUCTS.map((product) => (
        <li key={product.name} className={styles.row}>
          <span className={styles.thumb}>
            <Package size={16} />
          </span>
          <div className={styles.rowMain}>
            <span className={styles.rowTitle}>{product.name}</span>
            <span className={styles.rowSubtitle}>{product.sold}</span>
          </div>
          <span className={styles.rowAmount}>{product.revenue}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default TopProductsPanel;
