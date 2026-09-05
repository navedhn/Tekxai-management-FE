import React, { useState, useMemo, useRef } from 'react';
import { useGetProjects, ProjectDetail, useDeleteProjectMutation, useRestoreProjectMutation, useSaveProjectMutation, useUnsaveProjectMutation } from '@/services/projectService';
import { useMyPermissions } from '@/services/permissionsService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button, { IconButton, pageActionButtonClass, pageOutlineButtonClass } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import Loader from '@/components/ui/Loader';
import { Search, Filter, Plus, Edit2, Trash2, MoreVertical, Star, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getProjectStatusStyle, getProjectStatusLabel } from '@/utils/projectStatus';

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-gray-50 text-gray-500 border-gray-200',
  MEDIUM: 'bg-blue-50 text-blue-600 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-600 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-600 border-red-200',
};

const HEALTH_DOT: Record<string, string> = {
  HEALTHY: 'bg-emerald-500',
  AT_RISK: 'bg-yellow-400',
  WARNING: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};
const HEALTH_LABEL: Record<string, string> = {
  HEALTHY: 'Healthy', AT_RISK: 'At Risk', WARNING: 'Warning', CRITICAL: 'Critical',
};
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import FilterDropdown, { FilterState, DEFAULT_FILTER_STATE } from '@/components/ui/FilterDropdown';
import CreateProjectSlideOver from '@/components/ui/CreateProjectSlideOver';
import ActionModal from '@/components/ui/ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useProjectDashboardStats } from '@/services/projectDashboardService';
import ProjectDashboardKpis from '@/components/ui/ProjectDashboardKpis';

const ProjectManagement: React.FC = () => {
  const toast = useToastContext();
  const { data: myPerms } = useMyPermissions();
  const canArchive = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.projects.delete');

  const [showArchived, setShowArchived] = useState(false);
  const { data: projects, isLoading } = useGetProjects({ limit: 1000, archived: showArchived });
  const deleteMutation = useDeleteProjectMutation();
  const restoreMutation = useRestoreProjectMutation();
  const { data: dashboardStats } = useProjectDashboardStats();

  const [activeTab, setActiveTab] = useState('UI/UX Design');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectDetail | null>(null);
  const [projectToRestore, setProjectToRestore] = useState<ProjectDetail | null>(null);
  const [projectToToggleSave, setProjectToToggleSave] = useState<{ project: ProjectDetail, action: 'save' | 'unsave' } | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const itemsPerPage = 8;

  const tabs = ['UI/UX Design', 'Front End', 'Back End'];

  const filteredData = useMemo(() => {
    if (!projects) return [];
    let data = projects.filter(project =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filters.search) {
      data = data.filter(p => p.title.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.clientName) {
      data = data.filter(p => (p.client_name || '').toLowerCase().includes(filters.clientName!.toLowerCase()));
    }
    if (filters.ownerName) {
      data = data.filter(p => `${p.owner?.first_name || ''} ${p.owner?.last_name || ''}`.toLowerCase().includes(filters.ownerName!.toLowerCase()));
    }
    if (filters.status) {
      data = data.filter(p => p.status === filters.status);
    }
    if (filters.devStatus) {
      data = data.filter(p => (p.dev_status || '').toLowerCase().includes(filters.devStatus!.toLowerCase()));
    }
    if (filters.overdueOnly) {
      data = data.filter(p => p.is_overdue);
    }
    if (kpiFilter === 'overdue') data = data.filter(p => p.is_overdue);
    else if (kpiFilter === 'blocked') data = data.filter(p => p.status === 'BLOCKED' || (p.milestone_breakdown?.blocked || 0) > 0);
    else if (kpiFilter === 'delivered') data = data.filter(p => p.status === 'DELIVERED' || p.status === 'COMPLETED');
    else if (kpiFilter === 'needs_qa') data = data.filter(p => p.status === 'QA');
    else if (kpiFilter === 'waiting_on_client') data = data.filter(p => p.status === 'CLIENT_REVIEW');
    else if (kpiFilter === 'access_incomplete') data = data.filter(p => (p.access_completion_score?.percent || 0) < 100);
    if (filters.sortByLatest) {
      data = [...data].sort((a, b) => Number(b.id) - Number(a.id));
    }
    return data;
  }, [projects, searchTerm, filters, kpiFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'search' && v === true
  ).length;

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteMutation.mutateAsync(projectToDelete.id);
      toast.success('Project archived successfully');
      setProjectToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive project');
    }
  };

  const handleRestore = async () => {
    if (!projectToRestore) return;
    try {
      await restoreMutation.mutateAsync(projectToRestore.id);
      toast.success('Project restored successfully');
      setProjectToRestore(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore project');
    }
  };

  const saveMutation = useSaveProjectMutation();
  const unsaveMutation = useUnsaveProjectMutation();

  const handleToggleSave = async () => {
    if (!projectToToggleSave) return;
    const { project, action } = projectToToggleSave;
    try {
      if (action === 'save') {
        await saveMutation.mutateAsync(project.id);
        toast.success('Project saved successfully');
      } else {
        await unsaveMutation.mutateAsync(project.id);
        toast.success('Project unsaved successfully');
      }
      setProjectToToggleSave(null);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} project`);
    }
  };

  const columns: Column<ProjectDetail>[] = [
    { header: 'S.No', key: 'id', width: '80px', render: (_, index) => (currentPage - 1) * itemsPerPage + index + 1 },
    {
      header: 'Project Title',
      key: 'title',
      render: (item) => (
        <Button
          variant="link"
          size="sm"
          animation="none"
          rounded={false}
          onClick={() => setSelectedProjectId(item.id)}
          className="!p-0 h-auto !shadow-none !text-gray-900 font-black underline-offset-4"
        >
          {item.title}
        </Button>
      )
    },
    {
      header: 'Client',
      key: 'client_name',
      render: (item) => item.client_name
        ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-700">{item.client_name}</span>
            {/* Phase 2 Commercial Project Foundation — a filled dot marks a
                real client_accounts relation vs. legacy free text, so it's
                clear at a glance which projects are formally linked. */}
            {item.client_id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Linked to a real client record" />}
          </div>
        )
        : <span className="text-xs text-gray-400 italic">—</span>
    },
    {
      // Phase 2 Commercial Project Foundation — Bidder + Source/Platform
      // combined into one compact column (rather than two more columns) to
      // avoid overcrowding an already-wide table; both are secondary
      // commercial metadata, not primary tracking columns like Status/Health.
      header: 'Bidder / Source',
      key: 'bidder',
      render: (item) => {
        const bidderName = item.bidder ? `${item.bidder.first_name || ''} ${item.bidder.last_name || ''}`.trim() : null;
        if (!bidderName && !item.source) return <span className="text-xs text-gray-400 italic">—</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {bidderName && <span className="text-xs font-bold text-gray-700">{bidderName}</span>}
            {item.source && <span className="text-[10px] font-semibold text-gray-400">{item.source}</span>}
          </div>
        );
      }
    },
    {
      header: 'Priority',
      key: 'priority',
      render: (item) => (
        <Badge variant="info" className={cn("rounded-lg px-2.5 py-1 text-[10px] font-black tracking-tight border", PRIORITY_STYLE[item.priority || 'MEDIUM'])}>
          {item.priority || 'MEDIUM'}
        </Badge>
      )
    },
    {
      header: 'Business Unit',
      key: 'business_unit',
      render: (item) => item.business_unit?.name
        ? <span className="text-xs font-bold text-gray-700">{item.business_unit.name}</span>
        : <span className="text-xs text-gray-400 italic">—</span>
    },
    {
      header: 'Project Manager',
      key: 'owner',
      render: (item) => item.owner
        ? <span className="text-xs font-bold text-gray-700">{`${item.owner.first_name || ''} ${item.owner.last_name || ''}`.trim() || item.owner.email}</span>
        : <span className="text-xs text-gray-400 italic">Unassigned</span>
    },
    {
      header: 'Dev Status',
      key: 'dev_status',
      render: (item) => item.dev_status
        ? <span className="text-xs font-medium text-gray-600 max-w-[200px] block truncate" title={item.dev_status}>{item.dev_status}</span>
        : <span className="text-xs text-gray-400 italic">—</span>
    },
    {
      header: 'Pending Milestones',
      key: 'pending_milestones_count',
      render: (item) => {
        const count = item.pending_milestones_count || 0;
        if (count === 0) return <span className="text-xs text-gray-400 italic">None</span>;
        return <span className="text-xs font-black text-gray-800">{count === 1 ? 'Last' : count}</span>;
      }
    },
    {
      header: 'Team',
      key: 'member_role_counts',
      render: (item) => {
        const ROLE_BADGE: Record<string, { label: string; className: string }> = {
          FRONTEND:  { label: 'FE', className: 'bg-blue-50 text-blue-600' },
          BACKEND:   { label: 'BE', className: 'bg-purple-50 text-purple-600' },
          TEAM_LEAD: { label: 'TL', className: 'bg-amber-50 text-amber-700' },
          QA:        { label: 'QA', className: 'bg-green-50 text-green-700' },
          DEVOPS:    { label: 'DO', className: 'bg-slate-100 text-slate-600' },
          UI_UX:     { label: 'UX', className: 'bg-pink-50 text-pink-600' },
          MEMBER:    { label: 'MEM', className: 'bg-gray-100 text-gray-500' },
        };
        const counts = item.member_role_counts || {};
        const roles = Object.keys(counts).filter((r) => counts[r] > 0);
        if (roles.length === 0) {
          return <span className="text-[10px] text-gray-400 font-medium italic">No members</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => {
              const badge = ROLE_BADGE[role] || { label: role.slice(0, 3), className: 'bg-gray-100 text-gray-500' };
              return (
                <span key={role} className={`text-[10px] font-black px-2 py-1 rounded-full ${badge.className}`}>
                  {badge.label}: {counts[role]}
                </span>
              );
            })}
          </div>
        );
      }
    },
    { header: 'Project Hours', key: 'total_hours', render: (item) => `${item.total_hours} Hours` },
    {
      header: 'Progress',
      key: 'progress',
      render: (item) => (
        <div className="flex items-center gap-3 w-40">
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(31,123,255,0.4)]"
              style={{ width: `${item.progress || 0}%` }}
            />
          </div>
          <span className="text-[11px] font-black text-gray-400 min-w-[30px]">{item.progress || 0}%</span>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="info" className={cn("rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border", getProjectStatusStyle(item.status))}>
            {getProjectStatusLabel(item.status)}
          </Badge>
          {item.deleted_at && (
            <Badge variant="warning" className="rounded-lg px-2.5 py-1 text-[10px] font-black tracking-tight border bg-gray-100 text-gray-500 border-gray-200">
              Archived
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Health',
      key: 'health_status',
      render: (item) => {
        const status = item.health_status || 'HEALTHY';
        return (
          <div className="flex items-center gap-1.5" title={`Health score: ${item.health_score ?? '—'}`}>
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', HEALTH_DOT[status])} />
            <span className="text-xs font-bold text-gray-600">{HEALTH_LABEL[status]}</span>
          </div>
        );
      }
    },
    {
      header: 'Current Milestone',
      key: 'current_milestone',
      render: (item) => {
        const m = item.current_milestone;
        if (!m) return <span className="text-xs text-gray-400 italic">No milestone</span>;
        // Phase 3 — reads the server-computed delivery.status (compute_delivery)
        // rather than recomputing overdue client-side, so this always agrees
        // with the Milestone Details delivery badge for the same milestone.
        const isMissed = m.delivery ? m.delivery.status === 'MISSED' : (m.due_date && new Date(m.due_date) < new Date());
        return (
          <div className="flex flex-col gap-0.5 min-w-[140px]">
            <span className="text-xs font-bold text-gray-800 leading-tight">{m.title}</span>
            {m.due_date && (
              <span className={`text-[10px] font-medium ${isMissed ? 'text-red-500' : 'text-gray-400'}`}>
                Due {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        );
      }
    },
    {
      // Milestone Financial Foundation — every value here comes straight
      // from the API's `financial` object (compute_financial_summary in
      // projects.repository.js). Never recalculated in the frontend.
      header: 'Financials',
      key: 'financial',
      render: (item) => {
        const f = item.financial;
        if (!f || (f.total === 0 && f.paid === 0)) {
          return <span className="text-xs text-gray-400 italic">No milestones priced</span>;
        }
        const currency = f.currency || 'PKR';
        return (
          <div className="flex flex-col gap-0.5 min-w-[150px] text-[11px] font-bold">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">Active</span>
              <span className="text-primary-600 tabular-nums">{currency} {f.active.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">Paid</span>
              <span className="text-emerald-600 tabular-nums">{currency} {f.paid.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400">Remaining</span>
              <span className={cn('tabular-nums', f.remaining > 0 ? 'text-amber-600' : 'text-gray-700')}>{currency} {f.remaining.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-0.5 border-t border-gray-50">
              <span className="text-gray-400">Total</span>
              <span className="text-gray-900 tabular-nums">{currency} {f.total.toLocaleString()}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Delivery',
      key: 'end_date',
      render: (item) => (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-700">
            {item.end_date ? new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </span>
          {item.is_overdue ? (
            <Badge variant="warning" className="bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3] w-fit rounded-md px-2 py-0.5 text-[9px] font-black border">Overdue</Badge>
          ) : typeof item.days_remaining === 'number' && item.days_remaining >= 0 ? (
            <span className="text-[10px] font-bold text-gray-400">{item.days_remaining}d left</span>
          ) : null}
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <IconButton
            icon={Star}
            variant="ghost"
            size="sm"
            aria-label={item.is_saved ? "Unsave Project" : "Save Project"}
            title={item.is_saved ? "Unsave Project" : "Save Project"}
            onClick={() => setProjectToToggleSave({ project: item, action: item.is_saved ? 'unsave' : 'save' })}
            className={cn('!h-auto !w-auto p-2 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-500', item.is_saved && 'text-[#EAB308]')}
          />
          <IconButton
            icon={Edit2}
            variant="ghost"
            size="sm"
            aria-label="Edit Project"
            title="Edit Project"
            onClick={() => { setEditingProject(item); setIsFormOpen(true); }}
            disabled={!!item.deleted_at}
            className="!h-auto !w-auto p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none"
          />
          {canArchive && (
            item.deleted_at ? (
              <IconButton
                icon={ArchiveRestore}
                variant="ghost"
                size="sm"
                aria-label="Restore Project"
                title="Restore Project"
                onClick={() => setProjectToRestore(item)}
                className="!h-auto !w-auto p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
              />
            ) : (
              <IconButton
                icon={Archive}
                variant="ghost"
                size="sm"
                aria-label="Archive Project"
                title="Archive Project"
                onClick={() => setProjectToDelete(item)}
                className="!h-auto !w-auto p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
              />
            )
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <ProjectDetailsSlideOver
        isOpen={!!selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        projectId={selectedProjectId}
        routePrefix="/admin"
      />

      <CreateProjectSlideOver
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProject(null); }}
        project={editingProject}
      />

      <ActionModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDelete}
        title="Archive Project"
        description={`Are you sure you want to archive "${projectToDelete?.title}"? Its milestones, tasks, discussions and tracking links will be archived along with it. You can restore it later from the Archived tab.`}
        confirmText="Archive Project"
        loading={deleteMutation.isPending}
        icon="delete"
      />

      <ActionModal
        isOpen={!!projectToRestore}
        onClose={() => setProjectToRestore(null)}
        onConfirm={handleRestore}
        title="Restore Project"
        description={`Restore "${projectToRestore?.title}"? This will also restore any milestones/tasks/discussions/tracking links that were archived as part of the same archive action.`}
        confirmText="Restore Project"
        confirmVariant="primary"
        loading={restoreMutation.isPending}
        icon="info"
      />

      <ActionModal
        isOpen={!!projectToToggleSave}
        onClose={() => setProjectToToggleSave(null)}
        onConfirm={handleToggleSave}
        title={projectToToggleSave?.action === 'save' ? "Save Project" : "Unsave Project"}
        description={
          projectToToggleSave?.action === 'save'
            ? `Are you sure you want to save "${projectToToggleSave?.project.title}"?`
            : `Are you sure you want to unsave "${projectToToggleSave?.project.title}"?`
        }
        confirmText={projectToToggleSave?.action === 'save' ? "Save Project" : "Unsave Project"}
        loading={saveMutation.isPending || unsaveMutation.isPending}
        icon="delete"
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">All Projects</h1>
        <p className="text-sm text-gray-500 font-medium">Manage and track all your ongoing projects in one place.</p>
      </div>

      {canArchive && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => { setShowArchived(false); setCurrentPage(1); }}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-black transition-all',
              !showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Active
          </button>
          <button
            onClick={() => { setShowArchived(true); setCurrentPage(1); }}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5',
              showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Archive size={13} /> Archived
          </button>
        </div>
      )}

      {!showArchived && (
        <ProjectDashboardKpis stats={dashboardStats} activeFilter={kpiFilter} onFilterChange={(f) => { setKpiFilter(f); setCurrentPage(1); }} />
      )}

      <Card isLoading={isLoading} className="flex flex-col gap-8 shadow-2xl border-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row w-full sm:items-center gap-4 lg:flex-1 lg:min-w-0">
            <Input
              placeholder="Search projects..."
              leftIcon={Search}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              containerClassName="w-full lg:min-w-[280px]"
              className="h-11 rounded-xl"
            />

            <div className="relative sm:max-w-max w-full sm:w-auto">
              <Button
                ref={filterBtnRef}
                variant="outline"
                size="sm"
                rounded={false}
                leftIcon={Filter}
                onClick={() => setIsFilterOpen(prev => !prev)}
                className={cn(
                  pageOutlineButtonClass,
                  "transition-colors",
                  isFilterOpen ? "bg-primary-50 text-primary-600 border-primary-200" : "text-gray-600"
                )}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-[#005CDA] text-white text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <FilterDropdown
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onChange={(f) => { setFilters(f); setCurrentPage(1); }}
                triggerRef={filterBtnRef}
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            rounded={false}
            leftIcon={Plus}
            onClick={() => { setEditingProject(null); setIsFormOpen(true); }}
            className={pageActionButtonClass}
          >
            Create Project
          </Button>
        </div>

        <Table
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
            totalEntries: filteredData.length,
            entriesPerPage: itemsPerPage
          }}
          emptyMessage="No projects found."
        />
      </Card>
    </div>
  );
};

export default ProjectManagement;
