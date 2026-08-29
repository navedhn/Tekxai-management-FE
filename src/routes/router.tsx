import React, { lazy } from 'react';
import { createBrowserRouter, RouteObject, Navigate, useParams } from 'react-router-dom';
import PublicLayout from '@/layouts/publicLayout';
import AdminLayout from '@/layouts/adminLayout';
import EmployeeLayout from '@/layouts/employeeLayout';
import ProtectedRoute from '@/pages/layout/ProtectedRoute';
import PublicRoute from '@/pages/layout/PublicRoute';
import AuthLayout from '@/layouts/authLayout';
import MarketingLayout from '@/layouts/marketingLayout';
import ChatLayout from '@/layouts/chatLayout';
import { USER_ROLES } from '@/constants/roles';

// Redirects a retired /hr/* URL (which may carry route params) to its new
// /admin/* home — <Navigate> alone can't interpolate params, so this reads
// them via useParams() and lets the caller build the target path.
const ParamRedirect: React.FC<{ build: (params: Record<string, string | undefined>) => string }> = ({ build }) => {
  const params = useParams();
  return <Navigate to={build(params)} replace />;
};

// Public
const HomePage               = lazy(() => import('@/pages/public/homePage'));
const CandidateSignPage      = lazy(() => import('@/pages/public/candidateSign'));
const OfferReviewPage        = lazy(() => import('@/pages/public/offerReview'));
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
const AdminProjectTracking   = lazy(() => import('@/pages/admin/project-tracking'));
const AdminProjectTimeline   = lazy(() => import('@/pages/admin/project-timeline'));
const AdminTimesheet         = lazy(() => import('@/pages/admin/timesheet'));
const AdminSaved             = lazy(() => import('@/pages/admin/saved'));
const AdminTeam              = lazy(() => import('@/pages/admin/team'));
const AdminSettings          = lazy(() => import('@/pages/admin/settings'));
const SystemSettings         = lazy(() => import('@/pages/admin/system-settings'));
const AdminTickets           = lazy(() => import('@/pages/admin/tickets'));
const AdminMeetingDashboard  = lazy(() => import('@/pages/admin/meetings'));
const AdminMeetingRooms      = lazy(() => import('@/pages/admin/meetings/rooms'));
const AdminMeetingRoomDetail = lazy(() => import('@/pages/admin/meetings/room-detail'));
const AdminMeetingDetail     = lazy(() => import('@/pages/admin/meetings/meeting-detail'));
const AdminMeetingActionItems = lazy(() => import('@/pages/admin/meetings/action-items'));
const AdminUsers             = lazy(() => import('@/pages/admin/users'));
const AdminMonitoring        = lazy(() => import('@/pages/admin/monitoring'));
const AdminReports           = lazy(() => import('@/pages/admin/reports'));
const AdminProjectReport     = lazy(() => import('@/pages/admin/project-report'));
const AdminEstimator         = lazy(() => import('@/pages/admin/estimator'));
const AdminEmployeeProfile   = lazy(() => import('@/pages/admin/employee-profile'));
const AdminPermissions       = lazy(() => import('@/pages/admin/permissions'));
const AdminDesktopManagement = lazy(() => import('@/pages/admin/desktop-management'));
const AdminApprovals         = lazy(() => import('@/pages/admin/approvals'));

// HR workspace pages (reuse admin pages)
const AdminCRM               = lazy(() => import('@/pages/admin/crm'));
const AdminContracts         = lazy(() => import('@/pages/admin/contracts'));
const AdminHrDocuments       = lazy(() => import('@/pages/admin/hr-documents'));
const AdminHrDocumentDetail  = lazy(() => import('@/pages/admin/hr-documents/detail'));
const AdminHrDocumentTemplates = lazy(() => import('@/pages/admin/hr-document-templates'));
const AdminOnboarding        = lazy(() => import('@/pages/admin/onboarding'));
const AdminJobRequisitions   = lazy(() => import('@/pages/admin/job-requisitions'));
const AdminOffboarding       = lazy(() => import('@/pages/admin/offboarding'));
const AdminPolicies          = lazy(() => import('@/pages/admin/policies'));
const AdminAttendance        = lazy(() => import('@/pages/admin/attendance'));
const AdminEmployeeTimesheets = lazy(() => import('@/pages/admin/employee-timesheets'));
const AdminJobDescriptions   = lazy(() => import('@/pages/admin/job-descriptions'));
const AdminAssets            = lazy(() => import('@/pages/admin/assets'));
const AdminPerformance       = lazy(() => import('@/pages/admin/performance'));
const AdminBusinessUnits     = lazy(() => import('@/pages/admin/business-units'));
const AdminDepartments       = lazy(() => import('@/pages/admin/departments'));
const AdminDivisions         = lazy(() => import('@/pages/admin/divisions'));
const AdminDesignations      = lazy(() => import('@/pages/admin/designations'));
const AdminGrades            = lazy(() => import('@/pages/admin/grades'));
const AdminTicketCategories  = lazy(() => import('@/pages/admin/ticket-categories'));
const AdminTicketTypes       = lazy(() => import('@/pages/admin/ticket-types'));
const AdminOrgChart          = lazy(() => import('@/pages/admin/org-chart'));
const AdminRequisitions      = lazy(() => import('@/pages/admin/requisitions'));

// HR new pages
const EmployeeDirectory      = lazy(() => import('@/pages/admin/employee-directory'));
const AddEmployee            = lazy(() => import('@/pages/admin/add-employee'));
const HRReports              = lazy(() => import('@/pages/admin/hr-reports'));
const OvertimePage           = lazy(() => import('@/pages/admin/overtime'));
const IncrementsPage         = lazy(() => import('@/pages/admin/increments'));
const AdminExpenses          = lazy(() => import('@/pages/admin/expenses'));
const ComplianceViolations   = lazy(() => import('@/pages/admin/compliance-violations'));
const ManagerReview          = lazy(() => import('@/pages/admin/manager-review'));
const AdminExpenseLedger     = lazy(() => import('@/pages/admin/expenses/ledger'));
const AdminPerformanceScoring = lazy(() => import('@/pages/admin/performance-scoring'));
const AdminFinancialReports  = lazy(() => import('@/pages/admin/financial-reports'));
const EmailLogsPage          = lazy(() => import('@/pages/admin/email-logs'));
const PayrollPage            = lazy(() => import('@/pages/admin/payroll'));
const WebhooksPage           = lazy(() => import('@/pages/admin/webhooks'));
const ReportBuilderPage      = lazy(() => import('@/pages/admin/report-builder'));
const ReportsAnalyticsPage   = lazy(() => import('@/pages/admin/reports-analytics'));
const ExecutiveDashboardPage = lazy(() => import('@/pages/admin/executive-dashboard'));

// const MarketingWonDeals      = lazy(() => import('@/pages/marketing/won-deals'));
// const MarketingUpwork        = lazy(() => import('@/pages/marketing/upwork'));
// const MarketingLinkedIn      = lazy(() => import('@/pages/marketing/linkedin'));
// const MarketingEmailLeads    = lazy(() => import('@/pages/marketing/email-leads'));
// const MarketingDeposits      = lazy(() => import('@/pages/marketing/deposits'));
// const MarketingTargets       = lazy(() => import('@/pages/marketing/targets'));
// const MarketingMyReport      = lazy(() => import('@/pages/marketing/my-report'));
// const MarketingHRDashboard   = lazy(() => import('@/pages/marketing/hr-dashboard'));
// const MarketingSalaryHistory = lazy(() => import('@/pages/marketing/salary-history'));
// MarketingMySalaries and MarketingSalaryBuilder stay imported below — still used
// by /hr/my-salaries and /marketing/salary-builder/:memberId respectively.
const MarketingMySalaries    = lazy(() => import('@/pages/marketing/my-salaries'));
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
const EmployeeOnboarding     = lazy(() => import('@/pages/employee/onboarding'));
const DownloadApp            = lazy(() => import('@/pages/employee/download-app'));

// Shared
const SharedNotifications    = lazy(() => import('@/pages/shared/notifications'));
const ProfilePage            = lazy(() => import('@/pages/shared/profile'));

// Chat
const ChatPage               = lazy(() => import('@/pages/chat'));

const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] as any[];
const hrRoles    = [USER_ROLES.HR, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] as any[];
const allRoles   = Object.values(USER_ROLES) as any[];
// RBAC finalization — erpOpsRoles (a hardcoded org-role-name array gating
// the entire HR/ops-heavy bulk of /admin/*) is retired. It broke the moment
// every non-SUPER_ADMIN user was normalized onto a single EMPLOYEE role:
// none of ADMIN/HR/DIVISION_MANAGER/TEAM_LEAD/HR_ASSOCIATE/HR_MANAGER/
// HEAD_OF_HR exist as an assignable role name any more, so this single
// gate would have locked every one of those people out of the entire
// surface, even though the outer erp.workspace.access gate above already
// let them into /admin in the first place.
//
// It also turned out to be wrong even before that: querying production
// showed MARKETING already holds erp.projects.view=true (this array's own
// comment claimed Marketing was excluded from exactly that), while lacking
// erp.dashboard.view/erp.timesheet.view/erp.teams.view/erp.users.view/
// erp.reports.view — there was never one permission that correctly stood
// in for this whole heterogeneous page bundle.
//
// Replaced with a per-route permission map below (mirroring tek-pulse-FE's
// ROUTE_PERMISSIONS pattern) — each /admin/* sub-page gets its own
// ProtectedRoute wrapper keyed to its actual be-work permission-registry
// key, verified to exist in permission-keys.js. A handful of routes
// (project-tracking/timeline/starred → erp.projects.view;
// employee-timesheets → erp.timesheet.view; org-chart/divisions →
// erp.departments.view; manager-review/performance-scoring →
// erp.performance.view; report-builder → erp.reports.view;
// employee-directory → hr.employees.view; add-employee → erp.users.create;
// approvals → erp.requisitions.approve) don't have a page-specific
// permission key of their own yet and were mapped to the closest existing
// one covering the same data — flagged here for a human to confirm rather
// than silently assumed correct. /admin/hr is a pure redirect to /admin
// with no content of its own and is left ungated.

const routes: RouteObject[] = [
  // ── Public ──────────────────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',    element: <HomePage /> },
      { path: '/sign/:token', element: <CandidateSignPage /> },
      { path: '/offer/:id', element: <OfferReviewPage /> },
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
        element: <ProtectedRoute roles={hrRoles} permission="erp.workspace.access" />,
        children: [
          { path: '/admin',                      element: <AdminDashboard /> },
          // Neutral/personal pages plus the two CRM-adjacent ones Marketing
          // is specifically meant to reach — stay directly under the outer
          // erp.workspace.access gate.
          { path: '/admin/settings',             element: <AdminSettings /> },
          { path: '/admin/notifications',        element: <SharedNotifications /> },
          { path: '/admin/profile/:memberId?',   element: <ProfilePage /> },
          { path: '/admin/download-app',          element: <DownloadApp /> },
          { path: '/admin/crm',                 element: <AdminCRM /> },
          { path: '/admin/my-salaries',           element: <MarketingMySalaries /> },
          { element: <ProtectedRoute permission="erp.projects.view" />, children: [{ path: '/admin/projects', element: <AdminProjects /> }] },
          { element: <ProtectedRoute permission="erp.projects.view" />, children: [{ path: '/admin/project-tracking', element: <AdminProjectTracking /> }] },
          { element: <ProtectedRoute permission="erp.projects.view" />, children: [{ path: '/admin/project-timeline', element: <AdminProjectTimeline /> }] },
          { element: <ProtectedRoute permission="erp.timesheet.view" />, children: [{ path: '/admin/timesheet', element: <AdminTimesheet /> }] },
          { element: <ProtectedRoute permission="erp.projects.view" />, children: [{ path: '/admin/starred', element: <AdminSaved /> }] },
          { element: <ProtectedRoute permission="erp.teams.view" />, children: [{ path: '/admin/team', element: <AdminTeam /> }] },
          { element: <ProtectedRoute permission="erp.users.view" />, children: [{ path: '/admin/users', element: <AdminUsers /> }] },
          { element: <ProtectedRoute permission="erp.monitoring.view" />, children: [{ path: '/admin/monitoring', element: <AdminMonitoring /> }] },
          { element: <ProtectedRoute permission="erp.reports.view" />, children: [{ path: '/admin/reports', element: <AdminReports /> }] },
          { element: <ProtectedRoute permission="erp.reports.view" />, children: [{ path: '/admin/project-report', element: <AdminProjectReport /> }] },
          { element: <ProtectedRoute permission="erp.estimator.view" />, children: [{ path: '/admin/estimator', element: <AdminEstimator /> }] },
          { element: <ProtectedRoute permission="hr.employee_profiles.view" />, children: [{ path: '/admin/employee/:employeeId', element: <AdminEmployeeProfile /> }] },
          // Legacy admin HR routes (still accessible)
          { element: <ProtectedRoute permission="erp.assets.view" />, children: [{ path: '/admin/assets', element: <AdminAssets /> }] },
          { element: <ProtectedRoute permission="erp.performance.view" />, children: [{ path: '/admin/performance', element: <AdminPerformance /> }] },
          { element: <ProtectedRoute permission="erp.departments.view" />, children: [{ path: '/admin/departments', element: <AdminDepartments /> }] },
          { element: <ProtectedRoute permission="erp.departments.view" />, children: [{ path: '/admin/divisions', element: <AdminDivisions /> }] },
          { element: <ProtectedRoute permission="erp.designations.view" />, children: [{ path: '/admin/designations', element: <AdminDesignations /> }] },
          { element: <ProtectedRoute permission="erp.grades.view" />, children: [{ path: '/admin/grades', element: <AdminGrades /> }] },
          { element: <ProtectedRoute permission="erp.ticket-categories.view" />, children: [{ path: '/admin/ticket-categories', element: <AdminTicketCategories /> }] },
          { element: <ProtectedRoute permission="erp.ticket-types.view" />, children: [{ path: '/admin/ticket-types', element: <AdminTicketTypes /> }] },
          { element: <ProtectedRoute permission="erp.departments.view" />, children: [{ path: '/admin/org-chart', element: <AdminOrgChart /> }] },
          { element: <ProtectedRoute permission="erp.attendance.view" />, children: [{ path: '/admin/attendance', element: <AdminAttendance /> }] },
          { element: <ProtectedRoute permission="erp.timesheet.view" />, children: [{ path: '/admin/employee-timesheets', element: <AdminEmployeeTimesheets /> }] },
          { element: <ProtectedRoute permission="hr.job_descriptions.view" />, children: [{ path: '/admin/job-descriptions', element: <AdminJobDescriptions /> }] },
          { element: <ProtectedRoute permission="hr.contracts.view" />, children: [{ path: '/admin/contracts', element: <AdminContracts /> }] },
          { element: <ProtectedRoute permission="hr.onboarding.view" />, children: [{ path: '/admin/onboarding', element: <AdminOnboarding /> }] },
          { element: <ProtectedRoute permission="hr.job_requisitions.view" />, children: [{ path: '/admin/job-requisitions', element: <AdminJobRequisitions /> }] },
          { element: <ProtectedRoute permission="hr.offboarding.view" />, children: [{ path: '/admin/offboarding', element: <AdminOffboarding /> }] },
          { element: <ProtectedRoute permission="hr.policies.view" />, children: [{ path: '/admin/policies', element: <AdminPolicies /> }] },
          { element: <ProtectedRoute permission="erp.requisitions.view" />, children: [{ path: '/admin/requisitions', element: <AdminRequisitions /> }] },
          { element: <ProtectedRoute permission="erp.requisitions.approve" />, children: [{ path: '/admin/approvals', element: <AdminApprovals /> }] },
          { element: <ProtectedRoute permission="erp.tickets.view" />, children: [{ path: '/admin/tickets', element: <AdminTickets /> }] },
          { element: <ProtectedRoute permission="erp.meetings.view" />, children: [{ path: '/admin/meetings', element: <AdminMeetingDashboard /> }] },
          { element: <ProtectedRoute permission="erp.meetings.view" />, children: [{ path: '/admin/meetings/rooms', element: <AdminMeetingRooms /> }] },
          { element: <ProtectedRoute permission="erp.meetings.view" />, children: [{ path: '/admin/meetings/room/:roomId', element: <AdminMeetingRoomDetail /> }] },
          { element: <ProtectedRoute permission="erp.meetings.view" />, children: [{ path: '/admin/meetings/meeting/:meetingId', element: <AdminMeetingDetail /> }] },
          { element: <ProtectedRoute permission="erp.meetings.view" />, children: [{ path: '/admin/meetings/action-items', element: <AdminMeetingActionItems /> }] },
          // Finance module — Expense Claims + Financial Reports live under
          // /admin/finance/*. Old flat /admin/expenses(/...) paths redirect
          // below so existing bookmarks/links keep working.
          { element: <ProtectedRoute permission="erp.compliance_violations.manage" />, children: [{ path: '/admin/compliance-violations', element: <ComplianceViolations /> }] },
          { element: <ProtectedRoute permission="erp.performance.view" />, children: [{ path: '/admin/manager-review', element: <ManagerReview /> }] },
          { element: <ProtectedRoute permission="erp.expenses.view" />, children: [{ path: '/admin/finance/expenses', element: <AdminExpenses /> }] },
          { element: <ProtectedRoute permission="erp.expenses.view" />, children: [{ path: '/admin/finance/expenses/:userId', element: <AdminExpenseLedger /> }] },
          { element: <ProtectedRoute permission="erp.expenses.view" />, children: [{ path: '/admin/expenses', element: <Navigate to="/admin/finance/expenses" replace /> }] },
          { element: <ProtectedRoute permission="erp.expenses.view" />, children: [{ path: '/admin/expenses/:userId', element: <ParamRedirect build={(p) => `/admin/finance/expenses/${p.userId}`} /> }] },
          { element: <ProtectedRoute permission="erp.performance.view" />, children: [{ path: '/admin/performance-scoring', element: <AdminPerformanceScoring /> }] },
          { element: <ProtectedRoute permission="erp.payroll.view" />, children: [{ path: '/admin/payroll', element: <PayrollPage /> }] },
          { element: <ProtectedRoute permission="erp.webhooks.manage" />, children: [{ path: '/admin/webhooks', element: <WebhooksPage /> }] },
          { element: <ProtectedRoute permission="erp.reports.view" />, children: [{ path: '/admin/report-builder', element: <ReportBuilderPage /> }] },
          // Former HR-workspace-only pages, folded in as part of the HR/Admin merge
          { element: <ProtectedRoute permission="erp.business_units.view" />, children: [{ path: '/admin/business-units', element: <AdminBusinessUnits /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.view" />, children: [{ path: '/admin/documents', element: <AdminHrDocuments /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.view" />, children: [{ path: '/admin/documents/:id', element: <AdminHrDocumentDetail /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.view" />, children: [{ path: '/admin/document-templates', element: <AdminHrDocumentTemplates /> }] },
          { element: <ProtectedRoute permission="hr.employees.view" />, children: [{ path: '/admin/employee-directory', element: <EmployeeDirectory /> }] },
          { element: <ProtectedRoute permission="erp.users.create" />, children: [{ path: '/admin/add-employee/:employeeId?', element: <AddEmployee /> }] },
          { element: <ProtectedRoute permission="hr.reports.view" />, children: [{ path: '/admin/hr-reports', element: <HRReports /> }] },
          { element: <ProtectedRoute permission="erp.overtime.view" />, children: [{ path: '/admin/overtime', element: <OvertimePage /> }] },
          { element: <ProtectedRoute permission="hr.increments.view" />, children: [{ path: '/admin/increments', element: <IncrementsPage /> }] },
          { path: '/admin/hr', element: <Navigate to="/admin" replace /> },  // pure redirect to /admin, no content of its own — left ungated
          {
            element: <ProtectedRoute roles={adminRoles} permission="erp.executive-analytics.view" />,
            children: [
              { path: '/admin/executive-dashboard', element: <ExecutiveDashboardPage /> },
            ],
          },
          // SUPER_ADMIN-only sub-pages: the sidebar already hides these from
          // plain ADMIN users, but the route itself previously only required
          // {adminRoles: [SUPER_ADMIN, ADMIN]} + erp.workspace.access — which
          // an ordinary ADMIN satisfies via role match alone (bypassing the
          // permission check entirely), letting them reach these by URL.
          {
            element: <ProtectedRoute roles={[USER_ROLES.SUPER_ADMIN]} />,
            children: [
              { path: '/admin/permissions',         element: <AdminPermissions /> },
              { path: '/admin/desktop-management',  element: <AdminDesktopManagement /> },
              { path: '/admin/finance/financial-reports', element: <AdminFinancialReports /> },
              { path: '/admin/financial-reports',   element: <Navigate to="/admin/finance/financial-reports" replace /> },
              { path: '/admin/email-logs',          element: <EmailLogsPage /> },
              { path: '/admin/system-settings',     element: <SystemSettings /> },
              { path: '/admin/reports-analytics',   element: <ReportsAnalyticsPage /> },
            ],
          },
        ],
      },
      { path: '/admin/*', element: <NotFound /> },
    ],
  },
  // ── CRM Workspace (/crm) — retired. CRM is now its own product on its own
  // domain (TekPulse CRM); tekxai.services (this ERP) has no CRM awareness.
  // Old bookmarks/links redirect to /admin instead of 404ing.
  { path: '/crm/*',                        element: <Navigate to="/admin" replace /> },
  // ── HR Workspace (/hr) — retired, folded into /admin. Old bookmarks/links ──
  // redirect to their new /admin/* home instead of 404ing.
  { path: '/hr',                           element: <Navigate to="/admin" replace /> },
  { path: '/hr/employees',                 element: <Navigate to="/admin/employee-directory" replace /> },
  { path: '/hr/business-units',            element: <Navigate to="/admin/business-units" replace /> },
  { path: '/hr/departments',               element: <Navigate to="/admin/departments" replace /> },
  { path: '/hr/divisions',                 element: <Navigate to="/admin/divisions" replace /> },
  { path: '/hr/designations',              element: <Navigate to="/admin/designations" replace /> },
  { path: '/hr/grades',                    element: <Navigate to="/admin/grades" replace /> },
  { path: '/hr/org-chart',                 element: <Navigate to="/admin/org-chart" replace /> },
  { path: '/hr/attendance',                element: <Navigate to="/admin/attendance" replace /> },
  { path: '/hr/timesheet',                 element: <Navigate to="/admin/timesheet" replace /> },
  { path: '/hr/performance',               element: <Navigate to="/admin/performance" replace /> },
  { path: '/hr/performance-scoring',       element: <Navigate to="/admin/performance-scoring" replace /> },
  { path: '/hr/assets',                    element: <Navigate to="/admin/assets" replace /> },
  { path: '/hr/requisitions',              element: <Navigate to="/admin/requisitions" replace /> },
  { path: '/hr/contracts',                 element: <Navigate to="/admin/contracts" replace /> },
  { path: '/hr/documents',                 element: <Navigate to="/admin/documents" replace /> },
  { path: '/hr/documents/:id',             element: <ParamRedirect build={(p) => `/admin/documents/${p.id}`} /> },
  { path: '/hr/document-templates',        element: <Navigate to="/admin/document-templates" replace /> },
  { path: '/hr/onboarding',                element: <Navigate to="/admin/onboarding" replace /> },
  { path: '/hr/policies',                  element: <Navigate to="/admin/policies" replace /> },
  { path: '/hr/job-descriptions',          element: <Navigate to="/admin/job-descriptions" replace /> },
  { path: '/hr/my-salaries',               element: <Navigate to="/admin/my-salaries" replace /> },
  { path: '/hr/employee/:employeeId',      element: <ParamRedirect build={(p) => `/admin/employee/${p.employeeId}`} /> },
  { path: '/hr/employee-directory',        element: <Navigate to="/admin/employee-directory" replace /> },
  { path: '/hr/add-employee/:employeeId?', element: <ParamRedirect build={(p) => p.employeeId ? `/admin/add-employee/${p.employeeId}` : '/admin/add-employee'} /> },
  { path: '/hr/reports',                   element: <Navigate to="/admin/hr-reports" replace /> },
  { path: '/hr/overtime',                  element: <Navigate to="/admin/overtime" replace /> },
  { path: '/hr/increments',                element: <Navigate to="/admin/increments" replace /> },
  { path: '/hr/notifications',             element: <Navigate to="/admin/notifications" replace /> },
  { path: '/hr/profile/:memberId?',        element: <ParamRedirect build={(p) => p.memberId ? `/admin/profile/${p.memberId}` : '/admin/profile'} /> },
  { path: '/hr/monitoring',                element: <Navigate to="/admin/monitoring" replace /> },
  { path: '/hr/download-app',              element: <Navigate to="/admin/download-app" replace /> },
  { path: '/hr/*',                         element: <NotFound /> },
  // ── Employee Workspace (/employee) ─────────────────────────────────────────
  {
    element: <EmployeeLayout />,
    children: [
      {
        // Permission-based, not role-based: erp.employee_workspace.access is
        // granted to every role legitimately using this workspace (EMPLOYEE,
        // MARKETING, HR, DIVISION_MANAGER, TEAM_LEAD) — see DEFAULT_ROLE_PERMISSIONS
        // in be-work's permission-keys.js. roles= is kept as a belt-and-suspenders
        // fast path (ProtectedRoute checks role match before permission), not the
        // source of truth.
        element: (
          <ProtectedRoute
            roles={[USER_ROLES.EMPLOYEE, USER_ROLES.MARKETING, USER_ROLES.HR, USER_ROLES.DIVISION_MANAGER, USER_ROLES.TEAM_LEAD]}
            permission="erp.employee_workspace.access"
          />
        ),
        children: [
          { path: '/employee',                     element: <EmployeeDashboard /> },
          {
            // Projects is intentionally excluded from Marketing (and HR, which
            // also lacks erp.projects.view) — only roles/permissions that
            // already grant project visibility elsewhere in the app reach this.
            element: <ProtectedRoute roles={[USER_ROLES.EMPLOYEE]} permission="erp.projects.view" />,
            children: [
              { path: '/employee/projects', element: <EmployeeProjects /> },
            ],
          },
          { path: '/employee/starred',             element: <StarredQueries /> },
          { path: '/employee/timesheet',           element: <EmployeeTimesheet /> },
          { path: '/employee/tickets',             element: <EmployeeTickets /> },
          { path: '/employee/saved',               element: <EmployeeSaved /> },
          { path: '/employee/settings',            element: <EmployeeSettings /> },
          { path: '/employee/daily-report',        element: <DailyReport /> },
          { path: '/employee/documents',           element: <EmployeeDocuments /> },
          { path: '/employee/onboarding',          element: <EmployeeOnboarding /> },
          { path: '/employee/documents/:id',       element: <AdminHrDocumentDetail /> },
          { path: '/employee/download-app',        element: <DownloadApp /> },
          { path: '/employee/requisitions',        element: <AdminRequisitions /> },
          { path: '/employee/notifications',       element: <SharedNotifications /> },
          { path: '/employee/profile/:memberId?',  element: <ProfilePage /> },
        ],
      },
      { path: '/employee/*', element: <NotFound /> },
    ],
  },
  // ── Marketing salary-builder (legacy path, unrelated to the retired CRM
  // workspace — kept since it's still a live feature) ────────────────────────
  {
    element: <MarketingLayout />,
    children: [
      {
        element: <ProtectedRoute roles={[USER_ROLES.MARKETING, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.HR]} />,
        children: [
          { path: '/marketing',                          element: <Navigate to="/admin" replace /> },
          { path: '/marketing/salary-builder/:memberId', element: <MarketingSalaryBuilder /> },
          // The other legacy /marketing/* redirects (won-deals, salary-history,
          // upwork, linkedin, email-leads, deposits, targets, my-report,
          // my-salaries, hr-dashboard) pointed at /crm/* pages that were already
          // de-navigated in an earlier CRM split phase — every one of them was
          // silently 404ing via the /crm/* catch-all below. Removed rather than
          // fixed, since there's nothing live to redirect to and nothing else in
          // the app links to these paths (confirmed via grep) — CRM/ERP split
          // Milestone 4 (no dead navigation).
        ],
      },
      { path: '/marketing/*', element: <NotFound /> },
    ],
  },
  // ── Chat (all roles) ────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute roles={allRoles} />,
    children: [
      {
        element: <ChatLayout />,
        children: [{ path: '/chat', element: <ChatPage /> }],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
export default router;
