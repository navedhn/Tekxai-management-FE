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
import ClientPortalLayout from '@/layouts/clientPortalLayout';

const ParamRedirect: React.FC<{ build: (params: Record<string, string | undefined>) => string }> = ({ build }) => {
  const params = useParams();
  return <Navigate to={build(params)} replace />;
};

const HomePage               = lazy(() => import('@/pages/public/homePage'));
const CandidateSignPage      = lazy(() => import('@/pages/public/candidateSign'));
const ClientNdaSignPage      = lazy(() => import('@/pages/public/clientNdaSign'));
const OfferReviewPage        = lazy(() => import('@/pages/public/offerReview'));
const NotFound               = lazy(() => import('@/pages/404'));
const Forbidden              = lazy(() => import('@/pages/403'));

const Login                  = lazy(() => import('@/pages/auth/Login'));
const ForgetPassword         = lazy(() => import('@/pages/auth/ForgetPassword'));
const VerifyOTP              = lazy(() => import('@/pages/auth/VerifyOTP'));
const ResetPassword          = lazy(() => import('@/pages/auth/ResetPassword'));
const AcceptInvite           = lazy(() => import('@/pages/auth/AcceptInvite'));
const AcceptPortalInvite     = lazy(() => import('@/pages/portal/AcceptPortalInvite'));

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
const AdminProjectsReport    = lazy(() => import('@/pages/admin/projects-report'));
const AdminEstimator         = lazy(() => import('@/pages/admin/estimator'));
const AdminEmployeeProfile   = lazy(() => import('@/pages/admin/employee-profile'));
const AdminPermissions       = lazy(() => import('@/pages/admin/permissions'));
const AdminDesktopManagement = lazy(() => import('@/pages/admin/desktop-management'));
const AdminApprovals         = lazy(() => import('@/pages/admin/approvals'));

const AdminCRM               = lazy(() => import('@/pages/admin/crm'));
const AdminContracts         = lazy(() => import('@/pages/admin/contracts'));
const AdminHrDocuments       = lazy(() => import('@/pages/admin/hr-documents'));
const PerformanceReviews       = lazy(() => import('@/pages/admin/performance-reviews'));
const PerformanceReviewDetail  = lazy(() => import('@/pages/admin/performance-reviews/detail'));
const AdminHrDocumentDetail  = lazy(() => import('@/pages/admin/hr-documents/detail'));
const AdminHrDocumentTemplates = lazy(() => import('@/pages/admin/hr-document-templates'));
const AdminNda                = lazy(() => import('@/pages/admin/nda'));
const EmployeeNda              = lazy(() => import('@/pages/employee/nda'));
const AdminClientNda           = lazy(() => import('@/pages/admin/client-nda'));
const AdminClientNdaSign       = lazy(() => import('@/pages/admin/client-nda/sign'));
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

const MarketingWonDeals      = lazy(() => import('@/pages/marketing/won-deals'));
const MarketingUpwork        = lazy(() => import('@/pages/marketing/upwork'));
const MarketingLinkedIn      = lazy(() => import('@/pages/marketing/linkedin'));
const MarketingEmailLeads    = lazy(() => import('@/pages/marketing/email-leads'));
const MarketingDeposits      = lazy(() => import('@/pages/marketing/deposits'));
const MarketingTargets       = lazy(() => import('@/pages/marketing/targets'));
const MarketingMyReport      = lazy(() => import('@/pages/marketing/my-report'));
const MarketingHRDashboard   = lazy(() => import('@/pages/marketing/hr-dashboard'));
const MarketingSalaryHistory = lazy(() => import('@/pages/marketing/salary-history'));
const MarketingMySalaries    = lazy(() => import('@/pages/marketing/my-salaries'));
const MarketingSalaryBuilder = lazy(() => import('@/pages/marketing/salary-builder'));
const MarketingDashboard     = lazy(() => import('@/pages/marketing/dashboard'));

const EmployeeDashboard      = lazy(() => import('@/pages/employee/dashboard'));
const EmployeeProjects       = lazy(() => import('@/pages/employee/projects'));
const EmployeeTimesheet      = lazy(() => import('@/pages/employee/timesheet'));
const EmployeeSaved          = lazy(() => import('@/pages/employee/saved'));
const EmployeeSettings       = lazy(() => import('@/pages/employee/settings'));
const EmployeeTickets        = lazy(() => import('@/pages/employee/tickets'));
const StarredQueries         = lazy(() => import('@/pages/employee/starred'));
const DailyReport            = lazy(() => import('@/pages/employee/daily-report'));
const EmployeeDocuments      = lazy(() => import('@/pages/employee/documents'));
const EmployeePolicies       = lazy(() => import('@/pages/employee/policies'));
const EmployeeOnboarding     = lazy(() => import('@/pages/employee/onboarding'));
const DownloadApp            = lazy(() => import('@/pages/employee/download-app'));

const SharedNotifications    = lazy(() => import('@/pages/shared/notifications'));
const ProfilePage            = lazy(() => import('@/pages/shared/profile'));

const ChatPage               = lazy(() => import('@/pages/chat'));

const PortalDashboard        = lazy(() => import('@/pages/portal/dashboard'));
const PortalProjects         = lazy(() => import('@/pages/portal/projects'));
const PortalProjectDetail    = lazy(() => import('@/pages/portal/projects/detail'));

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/',    element: <HomePage /> },
      { path: '/sign/:token', element: <CandidateSignPage /> },
      { path: '/client-sign/:token', element: <ClientNdaSignPage /> },
      { path: '/offer/:id', element: <OfferReviewPage /> },
      { path: '/403', element: <Forbidden /> },
      { path: '/404', element: <NotFound /> },
      { path: '*',    element: <NotFound /> },
    ],
  },
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
          { path: '/portal/accept-invite/:token', element: <AcceptPortalInvite /> },
        ],
      },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      {
        element: <ProtectedRoute permission="erp.workspace.access" />,
        children: [
          { path: '/admin',                      element: <AdminDashboard /> },
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
          { element: <ProtectedRoute permission="erp.reports.view" />, children: [{ path: '/admin/projects-report', element: <AdminProjectsReport /> }] },
          { element: <ProtectedRoute permission="erp.estimator.view" />, children: [{ path: '/admin/estimator', element: <AdminEstimator /> }] },
          { element: <ProtectedRoute permission="hr.employee_profiles.view" />, children: [{ path: '/admin/employee/:employeeId', element: <AdminEmployeeProfile /> }] },
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
          { element: <ProtectedRoute permission="erp.business_units.view" />, children: [{ path: '/admin/business-units', element: <AdminBusinessUnits /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.view" />, children: [{ path: '/admin/documents', element: <AdminHrDocuments /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.view" />, children: [{ path: '/admin/documents/:id', element: <AdminHrDocumentDetail /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.view" />, children: [{ path: '/admin/document-templates', element: <AdminHrDocumentTemplates /> }] },
          { element: <ProtectedRoute permission="erp.hr_documents.manage" />, children: [{ path: '/admin/nda', element: <AdminNda /> }] },
          { element: <ProtectedRoute permission="crm.client_documents.manage" />, children: [{ path: '/admin/client-nda', element: <AdminClientNda /> }] },
          { element: <ProtectedRoute permission="hr.employees.view" />, children: [{ path: '/admin/employee-directory', element: <EmployeeDirectory /> }] },
          { element: <ProtectedRoute permission={['erp.users.create', 'hr.employees.edit']} />, children: [{ path: '/admin/add-employee/:employeeId?', element: <AddEmployee /> }] },
          { element: <ProtectedRoute permission="hr.reports.view" />, children: [{ path: '/admin/hr-reports', element: <HRReports /> }] },
          { element: <ProtectedRoute permission="hr.performance_reviews.view" />, children: [
            { path: '/admin/performance-reviews', element: <PerformanceReviews /> },
            { path: '/admin/performance-reviews/:id', element: <PerformanceReviewDetail /> },
          ] },
          { element: <ProtectedRoute permission="erp.overtime.view" />, children: [{ path: '/admin/overtime', element: <OvertimePage /> }] },
          { element: <ProtectedRoute permission="hr.increments.view" />, children: [{ path: '/admin/increments', element: <IncrementsPage /> }] },
          { path: '/admin/hr', element: <Navigate to="/admin" replace /> },
          {
            element: <ProtectedRoute permission="erp.executive-analytics.view" />,
            children: [
              { path: '/admin/executive-dashboard', element: <ExecutiveDashboardPage /> },
            ],
          },
          {
            element: <ProtectedRoute superAdminOnly />,
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
  { path: '/crm/*',                        element: <Navigate to="/admin" replace /> },
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
  {
    element: <EmployeeLayout />,
    children: [
      {
        element: (
          <ProtectedRoute
            permission="erp.employee_workspace.access"
          />
        ),
        children: [
          { path: '/employee',                     element: <EmployeeDashboard /> },
          {
            element: <ProtectedRoute permission="erp.employee_projects.view" />,
            children: [
              { path: '/employee/projects', element: <EmployeeProjects /> },
            ],
          },
          {
            element: <ProtectedRoute permission="erp.starred_queries.view" />,
            children: [
              { path: '/employee/starred',  element: <StarredQueries /> },
            ],
          },
          { path: '/employee/timesheet',           element: <EmployeeTimesheet /> },
          { path: '/employee/tickets',             element: <EmployeeTickets /> },
          { path: '/employee/saved',               element: <EmployeeSaved /> },
          { path: '/employee/settings',            element: <EmployeeSettings /> },
          { path: '/employee/daily-report',        element: <DailyReport /> },
          {
            element: <ProtectedRoute permission="erp.my_documents.view" />,
            children: [
              { path: '/employee/documents',     element: <EmployeeDocuments /> },
              { path: '/employee/documents/:id', element: <AdminHrDocumentDetail /> },
            ],
          },
          {
            element: <ProtectedRoute permission={['hr.policies.view', 'hr.policies.manage']} />,
            children: [
              { path: '/employee/policies', element: <EmployeePolicies /> },
            ],
          },
          { path: '/employee/nda/:id', element: <EmployeeNda /> },
          { path: '/admin/client-nda/:id/sign', element: <AdminClientNdaSign /> },
          { path: '/employee/onboarding', element: <EmployeeOnboarding /> },
          { path: '/employee/download-app',        element: <DownloadApp /> },
          { path: '/employee/requisitions',        element: <AdminRequisitions /> },
          { path: '/employee/notifications',       element: <SharedNotifications /> },
          { path: '/employee/profile/:memberId?',  element: <ProfilePage /> },
        ],
      },
      { path: '/employee/*', element: <NotFound /> },
    ],
  },
  {
    element: <MarketingLayout />,
    children: [
      {
        element: <ProtectedRoute permission="crm.salary.view" />,
        children: [
          { path: '/marketing',                          element: <Navigate to="/admin" replace /> },
          { path: '/marketing/salary-builder/:memberId', element: <MarketingSalaryBuilder /> },

        ],
      },
      { path: '/marketing/*', element: <NotFound /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <ChatLayout />,
        children: [{ path: '/chat', element: <ChatPage /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute clientOnly />,
    children: [
      {
        element: <ClientPortalLayout />,
        children: [
          { path: '/portal',                                element: <PortalDashboard /> },
          { path: '/portal/projects',                        element: <PortalProjects /> },
          { path: '/portal/projects/:id',                    element: <PortalProjectDetail /> },
          { path: '/portal/projects/:id/milestones',         element: <PortalProjectDetail /> },
          { path: '/portal/projects/:id/updates',            element: <PortalProjectDetail /> },
          { path: '/portal/projects/:id/communication',      element: <PortalProjectDetail /> },
          { path: '/portal/projects/:id/files',              element: <PortalProjectDetail /> },
          { path: '/portal/projects/:id/approvals',           element: <PortalProjectDetail /> },
        ],
      },
      { path: '/portal/*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
export default router;
