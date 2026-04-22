import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import RoleGuard from '../guards/RoleGuard';
import PublicRoute from '../guards/PublicRoute';
import Loader from '../components/Loader';

const MainLayout = lazy(() => import('../layouts/MainLayout'));
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ActivitiesPage = lazy(() => import('../pages/ActivitiesPage'));
const ActivityFormPage = lazy(() => import('../pages/ActivityFormPage'));
const MembersPage = lazy(() => import('../pages/MembersPage'));
const MemberFormPage = lazy(() => import('../pages/MemberFormPage'));
const MemberDetailPage = lazy(() => import('../pages/MemberDetailPage'));
const SubscriptionForm = lazy(() => import('../pages/SubscriptionForm'));
const SubscriptionsPage = lazy(() => import('../pages/SubscriptionsPage'));
const TicketsPage = lazy(() => import('../pages/TicketsPage'));
const QRControlPage = lazy(() => import('../pages/QRControlPage'));
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const ExpirationsPage = lazy(() => import('../pages/ExpirationsPage'));
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
    element: wrap(<PublicRoute><LandingPage /></PublicRoute>),
  },
  {
    path: '/login',
    element: wrap(<PublicRoute><LoginPage /></PublicRoute>),
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
        path: 'activities/new',
        element: guard(['ADMIN', 'CASHIER'], <ActivityFormPage />),
      },
      {
        path: 'activities/:slug/subscribe',
        element: guard(['ADMIN', 'CASHIER'], <SubscriptionForm />),
      },
      {
        path: 'activities/:slug/edit',
        element: guard(['ADMIN', 'CASHIER'], <ActivityFormPage />),
      },
      {
        path: 'members',
        element: guard(['ADMIN', 'CASHIER'], <MembersPage />),
      },
      {
        path: 'members/new',
        element: guard(['ADMIN', 'CASHIER'], <MemberFormPage />),
      },
      {
        path: 'members/subscribe',
        element: guard(['ADMIN', 'CASHIER'], <SubscriptionForm />),
      },
      {
        path: 'members/:slug/edit',
        element: guard(['ADMIN', 'CASHIER'], <MemberFormPage />),
      },
      {
        path: 'members/:slug',
        element: guard(['ADMIN', 'CASHIER', 'CONTROLLER'], <MemberDetailPage />),
      },
      {
        path: 'tickets',
        element: guard(['ADMIN', 'CASHIER'], <TicketsPage />),
      },
      {
        path: 'tickets/new',
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
      {
        path: 'expirations',
        element: guard(['ADMIN', 'CASHIER'], <ExpirationsPage />),
      },
      {
        path: 'subscriptions',
        element: guard(['ADMIN', 'CASHIER'], <SubscriptionsPage />),
      },
      {
        path: 'subscriptions/form',
        element: guard(['ADMIN', 'CASHIER'], <SubscriptionForm />),
      },
      {
        path: '*',
        element: wrap(<NotFound />),
      },
    ],
  },
];

export default routes;
