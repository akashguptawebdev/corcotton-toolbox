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
import NavigationPage from '@features/settings/NavigationPage';
import StaffPage from '@features/staff/StaffPage';
import RolesPermissionsPage from '@features/staff/RolesPermissionsPage';
import ComingSoonPage from '@pages/ComingSoonPage';
import ForbiddenPage from '@pages/ForbiddenPage';
import NotFoundPage from '@pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import { NAV_ITEMS_FLAT } from '@constants/navigation';

// Every nav item becomes a permission-guarded route. Dashboard gets its real page;
// everything else gets ComingSoonPage until that module is built — so RBAC gating
// is exercised end-to-end for every destination in the sidebar, not just the ones
// with a finished screen.
const adminChildren = NAV_ITEMS_FLAT.map(({ path, label, permission }) => ({
  path: path.replace(/^\//, ''),
  element: (
    <ProtectedRoute permission={permission}>
      {path === '/dashboard' ? <DashboardPage /> : null}
      {path === '/products' ? <ProductStudio /> : null}
      {path === '/categories' ? <CatalogPage module="categories" /> : null}
      {path === '/collections' ? <CatalogPage module="collections" /> : null}
      {path === '/brands' ? <CatalogPage module="brands" /> : null}
      {path === '/attributes' ? <CatalogPage module="attributes" /> : null}
      {path === '/tags' ? <CatalogPage module="tags" /> : null}
      {path === '/media' ? <MediaLibraryPage /> : null}
      {path === '/settings/tax' ? <TaxManagementPage /> : null}
      {path === '/settings/general' ? <StoreSettingsPage /> : null}
      {path === '/menus' ? <MenusPage /> : null}
      {path === '/navigation' ? <NavigationPage /> : null}
      {path === '/staff' ? <StaffPage /> : null}
      {path === '/roles' ? <RolesPermissionsPage /> : null}
      {!['/dashboard', '/products', '/categories', '/collections', '/brands', '/attributes', '/tags', '/media', '/settings/tax', '/settings/general', '/menus', '/navigation', '/staff', '/roles'].includes(path) ? <ComingSoonPage title={label} /> : null}
    </ProtectedRoute>
  ),
}));

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
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
