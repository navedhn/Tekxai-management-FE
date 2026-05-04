import React, { useState, useMemo, useRef } from 'react';
import { useGetProjects, ProjectSummary } from '@/services/employeeService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import ProjectDetailsSlideOver from '@/components/ui/ProjectDetailsSlideOver';
import FilterDropdown, { FilterState } from '@/components/ui/FilterDropdown';

const defaultFilters: FilterState = {
  search: '', sortByLatest: false, last24Hours: false,
  lastWeek: false, lastMonth: false, lastYear: false,
  starredOnly: false, hasDescription: false
};

const EmployeeProjects: React.FC = () => {
  const { data: projects, isLoading } = useGetProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const itemsPerPage = 8;

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

  const columns: Column<ProjectSummary>[] = [
    {
      header: 'S.No',
      key: 'id',
      width: '80px',
      render: (_, index) => (
        <span className="text-gray-900 font-black">
          {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
        </span>
      )
    },
    {
      header: 'Project Title',
      key: 'title',
      render: (item) => (
        <button
          onClick={() => setSelectedProject(item.id)}
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
          {item.members.map((m, i) => (
            <div key={i} className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-blue-50">
              {m}
            </div>
          ))}
          {item.members.length > 3 && (
            <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
              +{item.members.length - 3}
            </div>
          )}
        </div>
      )
    },
    { header: 'Projects Hours', key: 'hours', render: (item) => `${item.hours} Hours` },
    {
      header: 'Progress',
      key: 'progress',
      render: (item) => (
        <div className="flex items-center gap-3 w-40">
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(31,123,255,0.4)]"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[11px] font-black text-gray-400 min-w-[30px]">{item.progress}%</span>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => {
        const statusStyles: Record<string, string> = {
          'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
          'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
          'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
          'Completed': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
        };
        const style = statusStyles[item.status] || '';
        return (
          <Badge variant="info" className={cn("rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border shadow-none", style)}>
            {item.status}
          </Badge>
        );
      }
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      render: (item) => <span className="font-bold text-gray-500">{item.dueDate}</span>
    },
    {
      header: '',
      key: 'actions',
      render: () => (
        <button className="p-2 hover:bg-gray-100 rounded-lg text-primary-500 transition-colors active:scale-90">
          <MoreVertical size={18} />
        </button>
      )
    }
  ];


  return (
    <div className="flex flex-col gap-8 pb-10">
      <ProjectDetailsSlideOver
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        projectId={selectedProject}
        routePrefix="/employee"
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">All Projects</h1>

        <div className="flex items-center gap-3 flex-1 justify-end max-w-4xl">
          <Input
            placeholder="Search"
            leftIcon={Search}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            containerClassName="max-w-[500px] w-full"
            className="h-12 bg-white border-gray-100  shadow-sm"
          />

          <div className="relative">
            <Button
              ref={filterBtnRef}
              variant="outline"
              size="md"
              onClick={() => setIsFilterOpen(prev => !prev)}
              className={cn(
                "gap-2 border-gray-100 font-black rounded-md min-w-[110px] h-12 transition-all shadow-sm",
                isFilterOpen ? "bg-primary-50 text-primary-600 border-primary-200" : "bg-white text-gray-600"
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
        </div>
      </div>

      <Card className="flex flex-col gap-6 shadow-2xl border-none p-0 overflow-hidden bg-transparent shadow-none">
        <Table
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          className="bg-white rounded-3xl"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
            totalEntries: filteredData.length,
            entriesPerPage: itemsPerPage
          }}
        />
      </Card>
    </div>
  );
};

export default EmployeeProjects;
