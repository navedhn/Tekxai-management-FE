import React, { useState, useMemo, useRef } from 'react';
import { useGetProjects, ProjectDetail, useDeleteProjectMutation, useSaveProjectMutation, useUnsaveProjectMutation } from '@/services/projectService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import Loader from '@/components/ui/Loader';
import { Search, Filter, Plus, Edit2, Trash2, MoreVertical, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import FilterDropdown, { FilterState } from '@/components/ui/FilterDropdown';
import CreateProjectSlideOver from '@/components/ui/CreateProjectSlideOver';
import ActionModal from '@/components/ui/ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';

const defaultFilters: FilterState = {
  search: '', sortByLatest: false, last24Hours: false,
  lastWeek: false, lastMonth: false, lastYear: false,
  starredOnly: false, hasDescription: false
};

const ProjectManagement: React.FC = () => {
  const toast = useToastContext();
  const { data: projects, isLoading } = useGetProjects();
  const deleteMutation = useDeleteProjectMutation();

  const [activeTab, setActiveTab] = useState('UI/UX Design');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectDetail | null>(null);
  const [projectToToggleSave, setProjectToToggleSave] = useState<{ project: ProjectDetail, action: 'save' | 'unsave' } | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
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
    if (filters.sortByLatest) {
      data = [...data].sort((a, b) => Number(b.id) - Number(a.id));
    }
    return data;
  }, [projects, searchTerm, filters]);

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
      header: 'Member',
      key: 'members',
      render: (item) => (
        <div className="flex -space-x-2">
          {item.members?.slice(0, 3).map((m, i) => (
            <div key={i} className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-1 ring-blue-100 overflow-hidden bg-gray-100">
              {m.avatar ? (
                <img src={m.avatar} alt={m.first_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 uppercase">
                  {m.first_name.charAt(0)}
                </div>
              )}
            </div>
          ))}
          {item.member_count > 3 && (
            <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-gray-500 shadow-sm">
              +{item.member_count - 3}
            </div>
          )}
          {(!item.members || item.members.length === 0) && (
            <span className="text-[10px] text-gray-400 font-medium italic">No members</span>
          )}
        </div>
      )
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
      render: (item) => {
        const statusStyles: Record<string, string> = {
          'IN_PROGRESS': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
          'OVERDUE': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
          'PENDING': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
          'COMPLETED': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
        };
        const style = statusStyles[item.status] || 'bg-gray-50 text-gray-500 border-gray-100';
        return (
          <Badge variant="info" className={cn("rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border", style)}>
            {item.status || 'Pending'}
          </Badge>
        );
      }
    },
    { header: 'Due Date', key: 'end_date', render: (item) => item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A' },
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

  if (isLoading) return <Loader fullPage size={48} />;

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

      <Card className="flex flex-col gap-8 shadow-2xl border-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">


          <div className="flex flex-col sm:flex-row  w-full sm:items-center gap-4">
            <Input
              placeholder="Search projects..."
              leftIcon={Search}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              containerClassName="w-full lg:min-w-[280px]"
              className="h-11 rounded-xl"
            />

            <div className="relative sm:max-w-max w-full">
              <Button
                ref={filterBtnRef}
                variant="outline"
                size="md"
                onClick={() => setIsFilterOpen(prev => !prev)}
                className={cn(
                  "gap-2 border-gray-200 font-bold rounded-xl h-11 transition-colors w-full",
                  isFilterOpen ? "bg-primary-50 text-primary-600 border-primary-200" : "text-gray-600"
                )}
              >
                <Filter size={18} />
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

            <Button
              variant="primary"
              size="md"
              onClick={() => { setEditingProject(null); setIsFormOpen(true); }}
              className="gap-2 rounded-xl h-11 sm:min-w-[175px] sm:max-w-[175px] w-full text-[14px] font-black px-6 shadow-lg shadow-primary-100"
            >
              <Plus size={18} />
              Create Project
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={paginatedData}
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

