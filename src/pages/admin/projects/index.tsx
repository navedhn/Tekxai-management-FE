import React, { useState, useMemo, useRef } from 'react';
import { useGetProjects, ProjectDetail, useDeleteProjectMutation, useSaveProjectMutation, useUnsaveProjectMutation } from '@/services/projectService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button, { pageActionButtonClass, pageOutlineButtonClass } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import Loader from '@/components/ui/Loader';
import { Search, Filter, Plus, Edit2, Trash2, MoreVertical, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getProjectStatusStyle, getProjectStatusLabel } from '@/utils/projectStatus';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import FilterDropdown, { FilterState, DEFAULT_FILTER_STATE } from '@/components/ui/FilterDropdown';
import CreateProjectSlideOver from '@/components/ui/CreateProjectSlideOver';
import ActionModal from '@/components/ui/ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useProjectDashboardStats } from '@/services/projectDashboardService';
import ProjectDashboardKpis from '@/components/ui/ProjectDashboardKpis';

const ProjectManagement: React.FC = () => {
  const toast = useToastContext();
  // limit: 1000 — the table paginates client-side over `filteredData`, so the full
  // set must be loaded up front; the server default (20) was silently hiding every
  // project past the first page, which client-side "Page 2/3" pagination never surfaced.
  const { data: projects, isLoading } = useGetProjects({ limit: 1000 });
  const deleteMutation = useDeleteProjectMutation();
  const { data: dashboardStats } = useProjectDashboardStats();

  const [activeTab, setActiveTab] = useState('UI/UX Design');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectDetail | null>(null);
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
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project');
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
        <button
          onClick={() => setSelectedProjectId(item.id)}
          className="text-left font-black text-gray-900 transition-colors hover:text-primary-500 hover:underline underline-offset-4"
        >
          {item.title}
        </button>
      )
    },
    {
      header: 'Client',
      key: 'client_name',
      render: (item) => item.client_name
        ? <span className="text-sm font-bold text-gray-700">{item.client_name}</span>
        : <span className="text-xs text-gray-400 italic">—</span>
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
      // Compact role badges (FE/BE/QA/...) instead of a generic member-count
      // avatar stack — reuses the same project_members.role column.
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
        <Badge variant="info" className={cn("rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border", getProjectStatusStyle(item.status))}>
          {getProjectStatusLabel(item.status)}
        </Badge>
      )
    },
    {
      header: 'Current Milestone',
      key: 'current_milestone',
      render: (item) => {
        const m = item.current_milestone;
        if (!m) return <span className="text-xs text-gray-400 italic">No milestone</span>;
        const isOverdue = m.due_date && new Date(m.due_date) < new Date();
        return (
          <div className="flex flex-col gap-0.5 min-w-[140px]">
            <span className="text-xs font-bold text-gray-800 leading-tight">{m.title}</span>
            {m.due_date && (
              <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                Due {new Date(m.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
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
          <button
            onClick={() => setProjectToToggleSave({ project: item, action: item.is_saved ? 'unsave' : 'save' })}
            className="p-2 hover:bg-yellow-50 text-gray-400 hover:text-yellow-500 rounded-lg transition-all"
            title={item.is_saved ? "Unsave Project" : "Save Project"}
          >
            <Star size={16} className={item.is_saved ? "fill-[#EAB308] text-[#EAB308]" : ""} />
          </button>
          <button
            onClick={() => { setEditingProject(item); setIsFormOpen(true); }}
            className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all"
            title="Edit Project"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setProjectToDelete(item)}
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-all"
            title="Delete Project"
          >
            <Trash2 size={16} />
          </button>
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
        title="Delete Project"
        description={`Are you sure you want to delete "${projectToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Project"
        loading={deleteMutation.isPending}
        icon="delete"
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
        icon="delete" // using default icon structure for now
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">All Projects</h1>
        <p className="text-sm text-gray-500 font-medium">Manage and track all your ongoing projects in one place.</p>
      </div>

      <ProjectDashboardKpis stats={dashboardStats} activeFilter={kpiFilter} onFilterChange={(f) => { setKpiFilter(f); setCurrentPage(1); }} />

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

