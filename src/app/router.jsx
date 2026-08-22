import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '@layouts/AdminLayout/AdminLayout';
import AuthLayout from '@layouts/AuthLayout/AuthLayout';
import LoginPage from '@features/auth/LoginPage';
import ChangePasswordPage from '@features/auth/ChangePasswordPage';
import DashboardPage from '@features/dashboard/DashboardPage';
import CatalogPage from '@features/catalog/CatalogPage';
import ProductStudio from '@features/catalog/ProductStudio';
import MediaLibraryPage from '@features/media/MediaLibraryPage';
import TaxManagementPage from '@features/settings/TaxManagementPage';
import StoreSettingsPage from '@features/settings/StoreSettingsPage';
import MenusPage from '@features/settings/MenusPage';
import NavigationManagerPage from '@features/navigation/NavigationManagerPage';
import HomepageBuilderPage from '@features/homepage/HomepageBuilderPage';
import BannerManagementPage from '@features/banners/BannerManagementPage';
import StaffPage from '@features/staff/StaffPage';
import RolesPermissionsPage from '@features/staff/RolesPermissionsPage';
import ComingSoonPage from '@pages/ComingSoonPage';
import ForbiddenPage from '@pages/ForbiddenPage';
import NotFoundPage from '@pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import { NAV_ITEMS_FLAT } from '@constants/navigation';

// Sidebar path -> the screen that serves it. A path missing from this map falls back to
// ComingSoonPage, so adding a module means adding exactly one entry here — the previous
// ternary chain also carried a hand-maintained copy of this key list, and a page whose path
// was added to one but not the other rendered blank.
const PAGE_BY_PATH = {
  '/dashboard': <DashboardPage />,
  '/products': <ProductStudio />,
  '/categories': <CatalogPage module="categories" />,
  '/collections': <CatalogPage module="collections" />,
  '/brands': <CatalogPage module="brands" />,
  '/attributes': <CatalogPage module="attributes" />,
  '/tags': <CatalogPage module="tags" />,
  '/media': <MediaLibraryPage />,
  '/settings/tax': <TaxManagementPage />,
  '/settings/general': <StoreSettingsPage />,
  '/menus': <MenusPage />,
  '/homepage': <HomepageBuilderPage />,
  '/banners': <BannerManagementPage />,
  // Nav items and their mega menus are edited together on one screen.
  '/navigation': <NavigationManagerPage />,
  '/staff': <StaffPage />,
  '/roles': <RolesPermissionsPage />,
};

// Every nav item becomes a permission-guarded route — so RBAC gating is exercised
// end-to-end for every destination in the sidebar, not just the ones with a finished screen.
const adminChildren = NAV_ITEMS_FLAT.map(({ path, label, permission }) => ({
  path: path.replace(/^\//, ''),
  element: (
    <ProtectedRoute permission={permission}>
      {PAGE_BY_PATH[path] ?? <ComingSoonPage title={label} />}
    </ProtectedRoute>
  ),
}));

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  // Mega Menu Config was folded into Navigation — keep old links and open tabs working.
  { path: '/mega-menu-config', element: <Navigate to="/navigation" replace /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      // Standalone, no sidebar/nav chrome — same visual family as the login card, but
      // requires an existing (albeit mustChangePassword-flagged) session to reach.
      { path: '/change-password', element: <ProtectedRoute><ChangePasswordPage /></ProtectedRoute> },
    ],
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    element: <AdminLayout />,
    children: adminChildren,
  },
  { path: '*', element: <NotFoundPage /> },
]);
