import React, { lazy } from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import PublicLayout from '@/layouts/publicLayout';
import AdminLayout from '@/layouts/adminLayout';
import EmployeeLayout from '@/layouts/employeeLayout';
import ProtectedRoute from '@/pages/layout/ProtectedRoute';
import PublicRoute from '@/pages/layout/PublicRoute';
import AuthLayout from '@/layouts/authLayout';
import MarketingLayout from '@/layouts/marketingLayout';
import { USER_ROLES } from '@/constants/roles';

const HomePage = lazy(() => import('@/pages/public/homePage'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgetPassword = lazy(() => import('@/pages/auth/ForgetPassword'));
const VerifyOTP = lazy(() => import('@/pages/auth/VerifyOTP'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AcceptInvite = lazy(() => import('@/pages/auth/AcceptInvite'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const EmployeeDashboard = lazy(() => import('@/pages/employee/dashboard'));
const AdminProjects = lazy(() => import('@/pages/admin/projects'));
const AdminTimesheet = lazy(() => import('@/pages/admin/timesheet'));
const AdminSaved = lazy(() => import('@/pages/admin/saved'));
const AdminTeam = lazy(() => import('@/pages/admin/team'));
const AdminSettings = lazy(() => import('@/pages/admin/settings'));
const AdminPerformanceScoring = lazy(() => import('@/pages/admin/performance-scoring'));
const AdminUsers = lazy(() => import('@/pages/admin/users'));
const EmployeeProjects = lazy(() => import('@/pages/employee/projects'));
const EmployeeTimesheet = lazy(() => import('@/pages/employee/timesheet'));
const EmployeeSaved = lazy(() => import('@/pages/employee/saved'));
const EmployeeSettings = lazy(() => import('@/pages/employee/settings'));
const EmployeeTickets = lazy(() => import('@/pages/employee/tickets'));
const SharedNotifications = lazy(() => import('@/pages/shared/notifications'));
const ProjectDetailPage = lazy(() => import('@/pages/shared/projectDetail'));
const ProfilePage = lazy(() => import('@/pages/shared/profile'));
const StarredQueries = lazy(() => import('@/pages/employee/starred'));
const ChatPage = lazy(() => import('@/pages/chat'));
const MarketingDashboard = lazy(() => import('@/pages/marketing/dashboard'));
const MarketingWonDeals = lazy(() => import('@/pages/marketing/won-deals'));
const MarketingSalaryBuilder = lazy(() => import('@/pages/marketing/salary-builder'));
const MarketingSalaryHistory = lazy(() => import('@/pages/marketing/salary-history'));
const NotFound = lazy(() => import('@/pages/404'));
const Forbidden = lazy(() => import('@/pages/403'));

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/404', element: <NotFound /> },
      { path: '*', element: <NotFound /> }
    ]
  },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicRoute />,
        children: [
          { path: '/login', element: <Login /> },
          // { path: '/register', element: <Register /> }, // Note: Register might be mapped to Login if desired, or keep original
          { path: '/forget-password', element: <ForgetPassword /> },
          { path: '/verify-otp', element: <VerifyOTP /> },
          { path: '/reset-password', element: <ResetPassword /> },
          { path: '/invite/:token', element: <AcceptInvite /> },
        ]
      }
    ]
  },
  {
    element: <AdminLayout />,
    children: [
      {
        element: <ProtectedRoute roles={[USER_ROLES.ADMIN]} />,
        children: [
          { path: '/admin', element: <AdminDashboard /> },
          { path: '/admin/projects', element: <AdminProjects /> },
          { path: '/admin/timesheet', element: <AdminTimesheet /> },
          { path: '/admin/starred', element: <AdminSaved /> },
          { path: '/admin/team', element: <AdminTeam /> },
          { path: '/admin/settings', element: <AdminSettings /> },
          { path: '/admin/users', element: <AdminUsers /> },
          { path: '/admin/performance-scoring', element: <AdminPerformanceScoring /> },
          { path: '/admin/notifications', element: <SharedNotifications /> },
          { path: '/admin/project-detail', element: <ProjectDetailPage /> },
          { path: '/admin/profile/:memberId?', element: <ProfilePage /> },
        ]
      },
      { path: '/admin/*', element: <NotFound /> }
    ]
  },
  {
    element: <EmployeeLayout />,
    children: [
      {
        element: <ProtectedRoute roles={[USER_ROLES.EMPLLOYEE]} />,
        children: [
          { path: '/employee', element: <EmployeeDashboard /> },
          { path: '/employee/projects', element: <EmployeeProjects /> },
          { path: '/employee/starred', element: <StarredQueries /> },
          { path: '/employee/timesheet', element: <EmployeeTimesheet /> },
          { path: '/employee/tickets', element: <EmployeeTickets /> },
          { path: '/employee/saved', element: <EmployeeSaved /> },
          { path: '/employee/settings', element: <EmployeeSettings /> },
          { path: '/employee/notifications', element: <SharedNotifications /> },
          { path: '/employee/project-detail', element: <ProjectDetailPage /> },
          { path: '/employee/profile/:memberId?', element: <ProfilePage /> },
        ]
      },
      { path: '/employee/*', element: <NotFound /> }
    ]
  },
  // ── Marketing Portal (mock data — any logged-in user until MARKETING role exists) ──
  {
    element: <MarketingLayout />,
    children: [
      {
        element: <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.EMPLLOYEE]} />,
        children: [
          { path: '/marketing', element: <MarketingDashboard /> },
          { path: '/marketing/won-deals', element: <MarketingWonDeals /> },
          { path: '/marketing/salary-builder/:memberId', element: <MarketingSalaryBuilder /> },
          { path: '/marketing/salary-history', element: <MarketingSalaryHistory /> },
        ],
      },
      { path: '/marketing/*', element: <NotFound /> },
    ],
  },
  // ── Access denied (any logged-in user) ─────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [{ path: '/403', element: <Forbidden /> }],
  },
  // ── Standalone Chat (no layout, auth-protected for both roles) ─────────
  {
    element: <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.EMPLLOYEE]} />,
    children: [
      { path: '/chat', element: <ChatPage /> },
    ]
  },
];

export const router = createBrowserRouter(routes);
export default router;

