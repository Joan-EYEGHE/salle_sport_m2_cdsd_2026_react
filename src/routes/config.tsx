import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import RoleGuard from '../guards/RoleGuard';
import Loader from '../components/Loader';

const MainLayout = lazy(() => import('../layouts/MainLayout'));
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ActivitiesPage = lazy(() => import('../pages/ActivitiesPage'));
const MembersPage = lazy(() => import('../pages/MembersPage'));
const SubscriptionForm = lazy(() => import('../pages/SubscriptionForm'));
const TicketsPage = lazy(() => import('../pages/TicketsPage'));
const QRControlPage = lazy(() => import('../pages/QRControlPage'));
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const NotFound = lazy(() => import('../pages/NotFound'));

function wrap(el: React.ReactNode) {
  return <Suspense fallback={<Loader size="lg" />}>{el}</Suspense>;
}

function guard(roles: string[], el: React.ReactNode) {
  return wrap(<RoleGuard allowedRoles={roles}>{el}</RoleGuard>);
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: wrap(<LandingPage />),
  },
  {
    path: '/login',
    element: wrap(<LoginPage />),
  },
  {
    path: '/',
    element: wrap(<MainLayout />),
    children: [
      {
        path: 'dashboard',
        element: guard(['ADMIN', 'CASHIER'], <DashboardPage />),
      },
      {
        path: 'activities',
        element: guard(['ADMIN', 'CASHIER'], <ActivitiesPage />),
      },
      {
        path: 'activities/:id/subscribe',
        element: guard(['ADMIN', 'CASHIER'], <SubscriptionForm />),
      },
      {
        path: 'members',
        element: guard(['ADMIN', 'CASHIER'], <MembersPage />),
      },
      {
        path: 'members/subscribe',
        element: guard(['ADMIN', 'CASHIER'], <SubscriptionForm />),
      },
      {
        path: 'tickets',
        element: guard(['ADMIN', 'CASHIER'], <TicketsPage />),
      },
      {
        path: 'transactions',
        element: guard(['ADMIN', 'CASHIER'], <TransactionsPage />),
      },
      {
        path: 'qr-control',
        element: guard(['ADMIN', 'CONTROLLER'], <QRControlPage />),
      },
      {
        path: 'users',
        element: guard(['ADMIN'], <UsersPage />),
      },
    ],
  },
  {
    path: '*',
    element: wrap(<NotFound />),
  },
];

export default routes;
