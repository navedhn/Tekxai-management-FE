import React, { lazy } from 'react';
import { createBrowserRouter, RouteObject, Navigate } from 'react-router-dom';
import PublicLayout from '@/layouts/publicLayout';
import AdminLayout from '@/layouts/adminLayout';
import EmployeeLayout from '@/layouts/employeeLayout';
import ProtectedRoute from '@/pages/layout/ProtectedRoute';
import PublicRoute from '@/pages/layout/PublicRoute';
import AuthLayout from '@/layouts/authLayout';
import MarketingLayout from '@/layouts/marketingLayout';
import CRMLayout from '@/layouts/crmLayout';
import HRLayout from '@/layouts/hrLayout';
import { ADMIN_ROLES, USER_ROLES } from '@/constants/roles';

// Public
const HomePage               = lazy(() => import('@/pages/public/homePage'));
const NotFound               = lazy(() => import('@/pages/404'));
const Forbidden              = lazy(() => import('@/pages/403'));

// Auth
const Login                  = lazy(() => import('@/pages/auth/Login'));
const ForgetPassword         = lazy(() => import('@/pages/auth/ForgetPassword'));
const VerifyOTP              = lazy(() => import('@/pages/auth/VerifyOTP'));
const ResetPassword          = lazy(() => import('@/pages/auth/ResetPassword'));
const AcceptInvite           = lazy(() => import('@/pages/auth/AcceptInvite'));

// Admin / ERP core
const AdminDashboard         = lazy(() => import('@/pages/admin/dashboard'));
const AdminProjects          = lazy(() => import('@/pages/admin/projects'));
const AdminTimesheet         = lazy(() => import('@/pages/admin/timesheet'));
const AdminSaved             = lazy(() => import('@/pages/admin/saved'));
const AdminTeam              = lazy(() => import('@/pages/admin/team'));
const AdminSettings          = lazy(() => import('@/pages/admin/settings'));
const SystemSettings         = lazy(() => import('@/pages/admin/system-settings'));
const AdminTickets           = lazy(() => import('@/pages/admin/tickets'));
const AdminUsers             = lazy(() => import('@/pages/admin/users'));
const AdminMonitoring        = lazy(() => import('@/pages/admin/monitoring'));
const AdminReports           = lazy(() => import('@/pages/admin/reports'));
const AdminOperations        = lazy(() => import('@/pages/admin/operations'));
const AdminEstimator         = lazy(() => import('@/pages/admin/estimator'));
const AdminEmployeeProfile   = lazy(() => import('@/pages/admin/employee-profile'));
const AdminPermissions       = lazy(() => import('@/pages/admin/permissions'));
const AdminApprovals         = lazy(() => import('@/pages/admin/approvals'));

// HR workspace pages (reuse admin pages)
const AdminCRM               = lazy(() => import('@/pages/admin/crm'));
const AdminContracts         = lazy(() => import('@/pages/admin/contracts'));
const AdminOnboarding        = lazy(() => import('@/pages/admin/onboarding'));
const AdminPolicies          = lazy(() => import('@/pages/admin/policies'));
const AdminAttendance        = lazy(() => import('@/pages/admin/attendance'));
const AdminJobDescriptions   = lazy(() => import('@/pages/admin/job-descriptions'));
const AdminAssets            = lazy(() => import('@/pages/admin/assets'));
const AdminPerformance       = lazy(() => import('@/pages/admin/performance'));
const AdminDepartments       = lazy(() => import('@/pages/admin/departments'));
const AdminHRDashboard       = lazy(() => import('@/pages/admin/hr-dashboard'));
const AdminRequisitions      = lazy(() => import('@/pages/admin/requisitions'));

// HR new pages
const EmployeeDirectory      = lazy(() => import('@/pages/admin/employee-directory'));
const AddEmployee            = lazy(() => import('@/pages/admin/add-employee'));
const HRReports              = lazy(() => import('@/pages/admin/hr-reports'));
const OvertimePage           = lazy(() => import('@/pages/admin/overtime'));
const IncrementsPage         = lazy(() => import('@/pages/admin/increments'));
const AdminExpenses          = lazy(() => import('@/pages/admin/expenses'));
const AdminExpenseLedger     = lazy(() => import('@/pages/admin/expenses/ledger'));
const AdminPerformanceScoring = lazy(() => import('@/pages/admin/performance-scoring'));
const AdminFinancialReports  = lazy(() => import('@/pages/admin/financial-reports'));
const PayrollPage            = lazy(() => import('@/pages/admin/payroll'));
const WebhooksPage           = lazy(() => import('@/pages/admin/webhooks'));
const ReportBuilderPage      = lazy(() => import('@/pages/admin/report-builder'));

// CRM workspace pages
const CRMDashboard           = lazy(() => import('@/pages/crm/dashboard'));
const CRMPipeline            = lazy(() => import('@/pages/crm/pipeline'));
const CRMHandoffs            = lazy(() => import('@/pages/crm/handoffs'));
const CRMInvoices            = lazy(() => import('@/pages/crm/invoices'));
const CRMTeamPage            = lazy(() => import('@/pages/crm/team'));
const MarketingWonDeals      = lazy(() => import('@/pages/marketing/won-deals'));
const MarketingUpwork        = lazy(() => import('@/pages/marketing/upwork'));
const MarketingLinkedIn      = lazy(() => import('@/pages/marketing/linkedin'));
const MarketingEmailLeads    = lazy(() => import('@/pages/marketing/email-leads'));
const MarketingDeposits      = lazy(() => import('@/pages/marketing/deposits'));
const MarketingTargets       = lazy(() => import('@/pages/marketing/targets'));
const MarketingMyReport      = lazy(() => import('@/pages/marketing/my-report'));
const MarketingMySalaries    = lazy(() => import('@/pages/marketing/my-salaries'));
const MarketingHRDashboard   = lazy(() => import('@/pages/marketing/hr-dashboard'));
const MarketingSalaryHistory = lazy(() => import('@/pages/marketing/salary-history'));
const MarketingSalaryBuilder = lazy(() => import('@/pages/marketing/salary-builder'));
const MarketingDashboard     = lazy(() => import('@/pages/marketing/dashboard'));

// Employee
const EmployeeDashboard      = lazy(() => import('@/pages/employee/dashboard'));
const EmployeeProjects       = lazy(() => import('@/pages/employee/projects'));
const EmployeeTimesheet      = lazy(() => import('@/pages/employee/timesheet'));
const EmployeeSaved          = lazy(() => import('@/pages/employee/saved'));
const EmployeeSettings       = lazy(() => import('@/pages/employee/settings'));
const EmployeeTickets        = lazy(() => import('@/pages/employee/tickets'));
const StarredQueries         = lazy(() => import('@/pages/employee/starred'));
const DailyReport            = lazy(() => import('@/pages/employee/daily-report'));
const EmployeeDocuments      = lazy(() => import('@/pages/employee/documents'));
const DownloadApp            = lazy(() => import('@/pages/employee/download-app'));

// Shared
const SharedNotifications    = lazy(() => import('@/pages/shared/notifications'));
const ProjectDetailPage      = lazy(() => import('@/pages/shared/projectDetail'));
const ProfilePage            = lazy(() => import('@/pages/shared/profile'));

// Chat
const ChatPage               = lazy(() => import('@/pages/chat'));

const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] as any[];
const crmRoles   = [USER_ROLES.MARKETING, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] as any[];
const hrRoles    = [USER_ROLES.HR, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] as any[];
const allRoles   = Object.values(USER_ROLES) as any[];

const routes: RouteObject[] = [
  // ── Public ──────────────────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',    element: <HomePage /> },
      { path: '/403', element: <Forbidden /> },
      { path: '/404', element: <NotFound /> },
      { path: '*',    element: <NotFound /> },
    ],
  },
  // ── Auth ────────────────────────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicRoute />,
        children: [
          { path: '/login',           element: <Login /> },
          { path: '/forget-password', element: <ForgetPassword /> },
          { path: '/verify-otp',      element: <VerifyOTP /> },
          { path: '/reset-password',  element: <ResetPassword /> },
          { path: '/invite/:token',   element: <AcceptInvite /> },
        ],
      },
    ],
  },
  // ── ERP Workspace (/admin) ──────────────────────────────────────────────────
  {
    element: <AdminLayout />,
    children: [
      {
        element: <ProtectedRoute roles={adminRoles} permission="erp.workspace.access" />,
        children: [
          { path: '/admin',                      element: <AdminDashboard /> },
          { path: '/admin/projects',             element: <AdminProjects /> },
          { path: '/admin/timesheet',            element: <AdminTimesheet /> },
          { path: '/admin/starred',              element: <AdminSaved /> },
          { path: '/admin/team',                 element: <AdminTeam /> },
          { path: '/admin/settings',             element: <AdminSettings /> },
          { path: '/admin/system-settings',      element: <SystemSettings /> },
          { path: '/admin/users',                element: <AdminUsers /> },
          { path: '/admin/notifications',        element: <SharedNotifications /> },
          { path: '/admin/project-detail',       element: <ProjectDetailPage /> },
          { path: '/admin/profile/:memberId?',   element: <ProfilePage /> },
          { path: '/admin/operations',           element: <AdminOperations /> },
          { path: '/admin/monitoring',           element: <AdminMonitoring /> },
          { path: '/admin/reports',              element: <AdminReports /> },
          { path: '/admin/estimator',            element: <AdminEstimator /> },
          { path: '/admin/employee/:employeeId', element: <AdminEmployeeProfile /> },
          // Legacy admin HR routes (still accessible)
          { path: '/admin/assets',              element: <AdminAssets /> },
          { path: '/admin/performance',         element: <AdminPerformance /> },
          { path: '/admin/departments',         element: <AdminDepartments /> },
          { path: '/admin/hr',                  element: <AdminHRDashboard /> },
          { path: '/admin/attendance',          element: <AdminAttendance /> },
          { path: '/admin/job-descriptions',    element: <AdminJobDescriptions /> },
          { path: '/admin/crm',                 element: <AdminCRM /> },
          { path: '/admin/contracts',           element: <AdminContracts /> },
          { path: '/admin/reports',             element: <AdminReports /> },
          { path: '/admin/onboarding',          element: <AdminOnboarding /> },
          { path: '/admin/policies',            element: <AdminPolicies /> },
          { path: '/admin/requisitions',        element: <AdminRequisitions /> },
          { path: '/admin/permissions',         element: <AdminPermissions /> },
          { path: '/admin/approvals',           element: <AdminApprovals /> },
          { path: '/admin/tickets',             element: <AdminTickets /> },
          { path: '/admin/expenses',            element: <AdminExpenses /> },
          { path: '/admin/expenses/:userId',    element: <AdminExpenseLedger /> },
          { path: '/admin/performance-scoring', element: <AdminPerformanceScoring /> },
          { path: '/admin/financial-reports',   element: <AdminFinancialReports /> },
          { path: '/admin/payroll',            element: <PayrollPage /> },
          { path: '/admin/webhooks',           element: <WebhooksPage /> },
          { path: '/admin/report-builder',     element: <ReportBuilderPage /> },
        ],
      },
      { path: '/admin/*', element: <NotFound /> },
    ],
  },
  // ── CRM Workspace (/crm) ───────────────────────────────────────────────────
  {
    element: <CRMLayout />,
    children: [
      {
        element: <ProtectedRoute roles={crmRoles} />,
        children: [
          { path: '/crm',                             element: <CRMDashboard /> },
          { path: '/crm/upwork',                      element: <MarketingUpwork /> },
          { path: '/crm/linkedin',                    element: <MarketingLinkedIn /> },
          { path: '/crm/email-leads',                 element: <MarketingEmailLeads /> },
          { path: '/crm/won-deals',                   element: <MarketingWonDeals /> },
          { path: '/crm/deposits',                    element: <MarketingDeposits /> },
          { path: '/crm/targets',                     element: <MarketingTargets /> },
          { path: '/crm/my-report',                   element: <MarketingMyReport /> },
          { path: '/crm/my-salaries',                 element: <MarketingMySalaries /> },
          { path: '/crm/pipeline',                    element: <CRMPipeline /> },
          { path: '/crm/handoffs',                    element: <CRMHandoffs /> },
          { path: '/crm/notifications',               element: <SharedNotifications /> },
          { path: '/crm/profile/:memberId?',          element: <ProfilePage /> },
          // Admin/Super Admin only routes
          {
            element: <ProtectedRoute roles={adminRoles} />,
            children: [
              { path: '/crm/clients',                 element: <AdminCRM /> },
              { path: '/crm/estimator',               element: <AdminEstimator /> },
              { path: '/crm/contracts',               element: <AdminContracts /> },
              { path: '/crm/invoices',                element: <CRMInvoices /> },
              { path: '/crm/hr-dashboard',            element: <MarketingHRDashboard /> },
              { path: '/crm/salary-history',          element: <MarketingSalaryHistory /> },
              { path: '/crm/salary-builder/:memberId',element: <MarketingSalaryBuilder /> },
              { path: '/crm/team',                    element: <CRMTeamPage /> },
            ],
          },
        ],
      },
      { path: '/crm/*', element: <NotFound /> },
    ],
  },
  // ── HR Workspace (/hr) ─────────────────────────────────────────────────────
  {
    element: <HRLayout />,
    children: [
      {
        element: <ProtectedRoute roles={hrRoles} />,
        children: [
          { path: '/hr',                          element: <AdminHRDashboard /> },
          { path: '/hr/employees',                element: <Navigate to="/hr/employee-directory" replace /> },
          { path: '/hr/departments',              element: <AdminDepartments /> },
          { path: '/hr/attendance',               element: <AdminAttendance /> },
          { path: '/hr/timesheet',                element: <AdminTimesheet /> },
          { path: '/hr/performance',              element: <AdminPerformance /> },
          { path: '/hr/performance-scoring',     element: <AdminPerformanceScoring /> },
          { path: '/hr/assets',                   element: <AdminAssets /> },
          { path: '/hr/requisitions',             element: <AdminRequisitions /> },
          { path: '/hr/contracts',                element: <AdminContracts /> },
          { path: '/hr/onboarding',               element: <AdminOnboarding /> },
          { path: '/hr/policies',                 element: <AdminPolicies /> },
          { path: '/hr/job-descriptions',         element: <AdminJobDescriptions /> },
          { path: '/hr/my-salaries',              element: <MarketingMySalaries /> },
          { path: '/hr/employee/:employeeId',     element: <AdminEmployeeProfile /> },
          { path: '/hr/employee-directory',       element: <EmployeeDirectory /> },
          { path: '/hr/add-employee',             element: <AddEmployee /> },
          { path: '/hr/reports',                  element: <HRReports /> },
          { path: '/hr/overtime',                 element: <OvertimePage /> },
          { path: '/hr/increments',               element: <IncrementsPage /> },
          { path: '/hr/notifications',            element: <SharedNotifications /> },
          { path: '/hr/profile/:memberId?',       element: <ProfilePage /> },
          { path: '/hr/monitoring',               element: <AdminMonitoring /> },
          { path: '/hr/download-app',             element: <DownloadApp /> },
        ],
      },
      { path: '/hr/*', element: <NotFound /> },
    ],
  },
  // ── Employee Workspace (/employee) ─────────────────────────────────────────
  {
    element: <EmployeeLayout />,
    children: [
      {
        element: <ProtectedRoute roles={[USER_ROLES.EMPLOYEE]} />,
        children: [
          { path: '/employee',                     element: <EmployeeDashboard /> },
          { path: '/employee/projects',            element: <EmployeeProjects /> },
          { path: '/employee/starred',             element: <StarredQueries /> },
          { path: '/employee/timesheet',           element: <EmployeeTimesheet /> },
          { path: '/employee/tickets',             element: <EmployeeTickets /> },
          { path: '/employee/saved',               element: <EmployeeSaved /> },
          { path: '/employee/settings',            element: <EmployeeSettings /> },
          { path: '/employee/daily-report',        element: <DailyReport /> },
          { path: '/employee/documents',           element: <EmployeeDocuments /> },
          { path: '/employee/download-app',        element: <DownloadApp /> },
          { path: '/employee/requisitions',        element: <AdminRequisitions /> },
          { path: '/employee/notifications',       element: <SharedNotifications /> },
          { path: '/employee/project-detail',      element: <ProjectDetailPage /> },
          { path: '/employee/profile/:memberId?',  element: <ProfilePage /> },
        ],
      },
      { path: '/employee/*', element: <NotFound /> },
    ],
  },
  // ── Marketing (legacy – kept for backwards compat, redirect to /crm) ──────
  {
    element: <MarketingLayout />,
    children: [
      {
        element: <ProtectedRoute roles={[USER_ROLES.MARKETING, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.HR]} />,
        children: [
          { path: '/marketing',                          element: <Navigate to="/crm" replace /> },
          { path: '/marketing/won-deals',                element: <Navigate to="/crm/won-deals" replace /> },
          { path: '/marketing/salary-builder/:memberId', element: <MarketingSalaryBuilder /> },
          { path: '/marketing/salary-history',           element: <Navigate to="/crm/salary-history" replace /> },
          { path: '/marketing/upwork',                   element: <Navigate to="/crm/upwork" replace /> },
          { path: '/marketing/linkedin',                 element: <Navigate to="/crm/linkedin" replace /> },
          { path: '/marketing/email-leads',              element: <Navigate to="/crm/email-leads" replace /> },
          { path: '/marketing/deposits',                 element: <Navigate to="/crm/deposits" replace /> },
          { path: '/marketing/targets',                  element: <Navigate to="/crm/targets" replace /> },
          { path: '/marketing/my-report',                element: <Navigate to="/crm/my-report" replace /> },
          { path: '/marketing/my-salaries',              element: <Navigate to="/crm/my-salaries" replace /> },
          { path: '/marketing/hr-dashboard',             element: <Navigate to="/crm/hr-dashboard" replace /> },
        ],
      },
      { path: '/marketing/*', element: <NotFound /> },
    ],
  },
  // ── Chat (all roles) ────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute roles={allRoles} />,
    children: [{ path: '/chat', element: <ChatPage /> }],
  },
];

export const router = createBrowserRouter(routes);
export default router;
