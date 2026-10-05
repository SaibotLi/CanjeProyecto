import { createBrowserRouter } from 'react-router-dom'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { MenuPage } from '../pages/MenuPage'
import { PointsPage } from '../pages/PointsPage'
import { RewardsPage } from '../pages/RewardsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminPage } from '../pages/AdminPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AuthRequired } from '../features/auth/AuthRequired'
import { AuthPage } from '../pages/AuthPage'
import { AuthCallbackPage } from '../pages/AuthCallbackPage'
import { RecoveryPage } from '../pages/RecoveryPage'
import { MfaPage } from '../pages/MfaPage'
import { BusinessAdminRequired } from '../features/authority/BusinessAdminRequired'
import { AdminCatalogPage } from '../pages/AdminCatalogPage'
import { PlatformRequired } from '../features/authority/PlatformRequired'
import { PlatformPage } from '../pages/PlatformPage'

export const router = createBrowserRouter([
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <MenuPage /> },
      { path: '/points', element: <PointsPage /> },
      { path: '/rewards', element: <RewardsPage /> },
      { path: '/profile', element: <AuthRequired><ProfilePage /></AuthRequired> },
      { path: '/login', element: <AuthPage key="login" mode="login" /> },
      { path: '/register', element: <AuthPage key="register" mode="register" /> },
      { path: '/auth/forgot-password', element: <AuthPage key="forgot" mode="forgot" /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/auth/recovery', element: <RecoveryPage /> },
      { path: '/auth/mfa', element: <AuthRequired><MfaPage /></AuthRequired> },
      { path: '/platform', element: <AuthRequired><PlatformRequired><PlatformPage /></PlatformRequired></AuthRequired> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin', element: <AuthRequired><BusinessAdminRequired><AdminLayout /></BusinessAdminRequired></AuthRequired>, children: [
    { index: true, element: <AdminPage /> },
    { path: 'categories', element: <AdminCatalogPage key="categories" section="categories" /> },
    { path: 'products', element: <AdminCatalogPage key="items" section="items" /> },
  ] },
])
