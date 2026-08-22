import {
  LayoutDashboard,
  ShoppingBag,
  Undo2,
  ShoppingCart,
  Package,
  FolderTree,
  LayoutGrid,
  Award,
  SlidersHorizontal,
  Star,
  Users,
  UsersRound,
  Tag,
  Tags,
  Zap,
  Image,
  Mail,
  FileText,
  LayoutTemplate,
  Newspaper,
  FolderOpen,
  Search,
  Boxes,
  Warehouse,
  ArrowLeftRight,
  UserCog,
  ShieldCheck,
  Settings,
  CreditCard,
  Truck,
  Receipt,
  Bell,
  BarChart3,
  Menu,
} from 'lucide-react';
import { PERMISSIONS } from './permissions';

// Single source of truth for the sidebar AND the route table (see app/router.jsx).
// Every item's `permission` is checked by usePermission() — unauthorized items never
// render in the sidebar and their routes 403 if navigated to directly.
//
// `restricted: true` marks a feature that isn't released yet (still ComingSoonPage,
// or just not something Admin/Manager should be dealing with day-to-day): it's hidden
// from the sidebar for everyone except super_admin, regardless of what their permission
// grant would otherwise allow. Super admin's bypass means they always see every route —
// it's a preview mechanism, not a security boundary (there's no real data behind a
// ComingSoonPage). Drop the flag once a feature is actually built and ready to release.
export const NAV_SECTIONS = [
  {
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW }],
  },
  {
    label: 'Sales',
    restricted: true,
    items: [
      { label: 'Orders', path: '/orders', icon: ShoppingBag, permission: PERMISSIONS.ORDER_VIEW },
      { label: 'Returns', path: '/returns', icon: Undo2, permission: PERMISSIONS.RETURN_VIEW },
      { label: 'Abandoned Carts', path: '/abandoned-carts', icon: ShoppingCart, permission: PERMISSIONS.CART_VIEW },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', path: '/products', icon: Package, permission: PERMISSIONS.PRODUCT_VIEW },
      { label: 'Categories', path: '/categories', icon: FolderTree, permission: PERMISSIONS.CATEGORY_VIEW },
      { label: 'Collections', path: '/collections', icon: LayoutGrid, permission: PERMISSIONS.COLLECTION_VIEW },
      { label: 'Brands', path: '/brands', icon: Award, permission: PERMISSIONS.BRAND_VIEW },
      { label: 'Attributes', path: '/attributes', icon: SlidersHorizontal, permission: PERMISSIONS.ATTRIBUTE_VIEW },
      { label: 'Tags', path: '/tags', icon: Tags, permission: PERMISSIONS.TAG_VIEW },
      { label: 'Media Library', path: '/media', icon: FolderOpen, permission: PERMISSIONS.MEDIA_VIEW },
      { label: 'Reviews', path: '/reviews', icon: Star, permission: PERMISSIONS.REVIEW_MODERATE, restricted: true },
    ],
  },
  {
    label: 'Customers',
    restricted: true,
    items: [
      { label: 'Customers', path: '/customers', icon: Users, permission: PERMISSIONS.CUSTOMER_VIEW },
      { label: 'Customer Groups', path: '/customer-groups', icon: UsersRound, permission: PERMISSIONS.CUSTOMER_VIEW },
      { label: 'Segments', path: '/segments', icon: SlidersHorizontal, permission: PERMISSIONS.CUSTOMER_VIEW },
    ],
  },
  {
    label: 'Storefront',
    items: [
      { label: 'Homepage', path: '/homepage', icon: Image, permission: PERMISSIONS.BANNER_VIEW },
      { label: 'Banners', path: '/banners', icon: Image, permission: PERMISSIONS.BANNER_VIEW },
    ],
  },
  {
    label: 'Marketing',
    restricted: true,
    items: [
      { label: 'Coupons', path: '/coupons', icon: Tag, permission: PERMISSIONS.COUPON_VIEW },
      { label: 'Email Campaigns', path: '/email-campaigns', icon: Mail, permission: PERMISSIONS.NEWSLETTER_VIEW },
      { label: 'Flash Sales', path: '/flash-sales', icon: Zap, permission: PERMISSIONS.FLASHSALE_VIEW },
      { label: 'SEO & Analytics', path: '/seo-analytics', icon: Search, permission: PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    label: 'Content',
    restricted: true,
    items: [
      { label: 'Pages', path: '/pages', icon: FileText, permission: PERMISSIONS.CMS_VIEW },
      { label: 'Blog Posts', path: '/blogs', icon: Newspaper, permission: PERMISSIONS.BLOG_VIEW },
      { label: 'Menus', path: '/menus', icon: LayoutTemplate, permission: PERMISSIONS.NAVIGATION_VIEW },
    ],
  },
  {
    label: 'Navigation',
    items: [
      // One screen owns both the header items and the mega menu behind each of them —
      // they are the same unit of work, and splitting them meant a new item had to be
      // saved on one page before the other page could configure it.
      { label: 'Navigation', path: '/navigation', icon: Menu, permission: PERMISSIONS.NAVIGATION_VIEW },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock', path: '/inventory', icon: Boxes, permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Warehouses', path: '/warehouses', icon: Warehouse, permission: PERMISSIONS.INVENTORY_VIEW, restricted: true },
      { label: 'Transfers', path: '/transfers', icon: ArrowLeftRight, permission: PERMISSIONS.INVENTORY_TRANSFER, restricted: true },
    ],
  },
  {
    label: 'Store Management',
    restricted: true,
    items: [
      { label: 'Stores', path: '/stores', icon: Warehouse, permission: PERMISSIONS.SETTINGS_VIEW },
      { label: 'Vendors', path: '/vendors', icon: UsersRound, permission: PERMISSIONS.USER_VIEW },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'General Settings', path: '/settings/general', icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
      { label: 'Tax Management', path: '/settings/tax', icon: Receipt, permission: PERMISSIONS.TAX_VIEW },
      { label: 'Payment Methods', path: '/settings/payments', icon: CreditCard, permission: PERMISSIONS.SETTINGS_MANAGE, restricted: true },
      { label: 'Shipping Methods', path: '/settings/shipping', icon: Truck, permission: PERMISSIONS.SETTINGS_MANAGE, restricted: true },
      { label: 'Notifications', path: '/settings/notifications', icon: Bell, permission: PERMISSIONS.SETTINGS_MANAGE, restricted: true },
      { label: 'Integrations', path: '/settings/integrations', icon: ArrowLeftRight, permission: PERMISSIONS.SETTINGS_MANAGE, restricted: true },
      { label: 'Backup & Import', path: '/settings/backup-import', icon: FolderOpen, permission: PERMISSIONS.SETTINGS_MANAGE, restricted: true },
    ],
  },
  {
    // Pinned last (Sidebar styles the final section distinctly). role.manage is
    // deliberately the one permission rolePermissionMatrix.constants.js withholds from
    // Admin, so this is already super_admin-only via permission — no `restricted` needed.
    items: [
      { label: 'Staff Members', path: '/staff', icon: UserCog, permission: PERMISSIONS.ROLE_MANAGE },
      { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, permission: PERMISSIONS.ROLE_MANAGE },
    ],
  },
  {
    restricted: true,
    items: [{ label: 'Reports & Analytics', path: '/reports', icon: BarChart3, permission: PERMISSIONS.REPORT_VIEW }],
  },
];

// Flat list — used by the router to generate a route per nav item.
export const NAV_ITEMS_FLAT = NAV_SECTIONS.flatMap((section) => section.items);
