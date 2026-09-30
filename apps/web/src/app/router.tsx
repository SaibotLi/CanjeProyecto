import { createBrowserRouter } from 'react-router-dom'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { AdminLayout } from '../layouts/AdminLayout'
import { MenuPage } from '../pages/MenuPage'
import { PointsPage } from '../pages/PointsPage'
import { RewardsPage } from '../pages/RewardsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminPage } from '../pages/AdminPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <MenuPage /> },
      { path: '/points', element: <PointsPage /> },
      { path: '/rewards', element: <RewardsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin', element: <AdminLayout />, children: [{ index: true, element: <AdminPage /> }] },
])
