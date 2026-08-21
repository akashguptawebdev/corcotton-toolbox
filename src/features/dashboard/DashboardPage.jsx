import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FolderPlus,
  Image,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  Tag,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import StatCard from '@components/ui/StatCard/StatCard';
import Button from '@components/ui/Button/Button';
import PageHeader from '@components/ui/PageHeader/PageHeader';
import Can from '@components/rbac/Can';
import { PERMISSIONS } from '@constants/permissions';
import SalesOverviewChart from './charts/SalesOverviewChart';
import DonutChart from './charts/DonutChart';
import RecentOrdersPanel from './panels/RecentOrdersPanel';
import TopProductsPanel from './panels/TopProductsPanel';
import PerformancePanel from './panels/PerformancePanel';
import styles from './DashboardPage.module.scss';

// Sample data — replace with GET /admin/reports/overview once the reports module lands.
const SALES_BY_CATEGORY = [
  { name: 'T-Shirts', value: 15231.89 },
  { name: 'Hoodies', value: 12452.1 },
  { name: 'Shirts', value: 7231.45 },
  { name: 'Pants & Joggers', value: 5321.23 },
  { name: 'Accessories', value: 3995.22 },
  { name: 'Others', value: 1000.0 },
];

const ORDER_STATUS = [
  { name: 'Completed', value: 600 },
  { name: 'Processing', value: 250, display: '250' },
  { name: 'Shipped', value: 200 },
  { name: 'Pending', value: 120 },
  { name: 'Cancelled', value: 83 },
];

const QUICK_ACTIONS = [
  { label: 'Add Product', icon: PackagePlus, to: '/products', permission: PERMISSIONS.PRODUCT_CREATE },
  { label: 'Add Category', icon: FolderPlus, to: '/categories', permission: PERMISSIONS.CATEGORY_VIEW },
  { label: 'Add Coupon', icon: Tag, to: '/coupons', permission: PERMISSIONS.COUPON_CREATE },
  { label: 'Create Banner', icon: Image, to: '/banners', permission: PERMISSIONS.BANNER_VIEW },
  { label: 'Manage Users', icon: UserCog, to: '/staff', permission: PERMISSIONS.USER_VIEW },
  { label: 'Payment Methods', icon: CreditCard, to: '/settings/payments', permission: PERMISSIONS.SETTINGS_MANAGE },
  { label: 'Shipping Methods', icon: Truck, to: '/settings/shipping', permission: PERMISSIONS.SETTINGS_MANAGE },
  { label: 'View Reports', icon: BarChart3, to: '/reports', permission: PERMISSIONS.REPORT_VIEW },
];

const STAT_CARDS = [
  {
    icon: DollarSign,
    label: 'Total Sales',
    value: '$45,231.89',
    delta: '+18.5%',
    iconTone: 'violet',
    trendTone: 'violet',
    trend: [22, 19, 24, 23, 31, 26, 34, 29, 36, 39, 47, 35, 41],
  },
  {
    icon: ShoppingBag,
    label: 'Total Orders',
    value: '1,253',
    delta: '+12.4%',
    iconTone: 'mint',
    trendTone: 'mint',
    trend: [14, 18, 15, 23, 20, 28, 22, 25, 31, 38, 27, 34, 32],
  },
  {
    icon: Users,
    label: 'Total Customers',
    value: '843',
    delta: '+16.2%',
    iconTone: 'amber',
    trendTone: 'amber',
    trend: [11, 13, 12, 18, 14, 20, 17, 19, 25, 28, 21, 26, 22],
  },
  {
    icon: Wallet,
    label: 'Average Order Value',
    value: '$36.11',
    delta: '+8.6%',
    iconTone: 'sky',
    trendTone: 'sky',
    trend: [18, 16, 21, 19, 25, 20, 28, 24, 30, 27, 34, 29, 32],
  },
  {
    icon: TrendingUp,
    label: 'Total Profit',
    value: '$12,231.53',
    delta: '+20.1%',
    iconTone: 'rose',
    trendTone: 'rose',
    trend: [13, 17, 15, 22, 18, 27, 23, 29, 25, 33, 28, 35, 31],
  },
];

const DashboardPage = () => {
  const user = useSelector((state) => state.auth.user);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Overview"
        icon={BarChart3}
        title="Dashboard"
        description={`Welcome back, ${user?.name?.split(' ')[0] || 'Admin'}. Here's what's happening with your store today.`}
        meta="Today"
        actions={(
          <>
            <Button type="button" variant="secondary">
              <Calendar size={16} /> May 25, 2025 - Jun 25, 2025
            </Button>
            <Button type="button">
              <ReceiptText size={16} /> Export Report <Download size={15} />
            </Button>
          </>
        )}
      />

      <div className={styles.statGrid}>
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Sales Overview</h3>
            <select aria-label="Sales overview range">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <SalesOverviewChart />
        </div>
        <TopProductsPanel />
        <RecentOrdersPanel />
      </div>

      <div className={styles.donutGrid}>
        <DonutChart title="Sales by Category" data={SALES_BY_CATEGORY} totalLabel="Total Sales" />
        <DonutChart title="Order Status" data={ORDER_STATUS} totalLabel="Total Orders" />
        <PerformancePanel />
      </div>

      <div className={styles.actionsRow}>
        {QUICK_ACTIONS.map((action) => (
          <Can key={action.label} permission={action.permission}>
            <Link to={action.to} className={styles.actionButton}>
              <span className={styles.actionIcon}>
                <action.icon size={18} />
              </span>
              <span>{action.label}</span>
            </Link>
          </Can>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
