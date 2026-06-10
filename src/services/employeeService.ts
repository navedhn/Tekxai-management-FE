import { useQuery } from '@tanstack/react-query';
import type { ActivityPreviewVariant } from '@/components/dashboard/ActivityPreview';

// --- Types ---

export interface DashboardStats {
  completedProjects: number;
  totalHours: number;
  overdueProjects: number;
  latestCheckIn: string;
  pendingTimesheets: number;
}

export interface Activity {
  id: string;
  title: string;
  progress: number;
  /** Real screenshot URL/path — takes priority over preview */
  image?: string;
  /** Built-in mini dashboard UI until screenshots are provided */
  preview?: ActivityPreviewVariant;
  updatedAt?: string;
}

export interface TimesheetEntry {
  id: string;
  employee: string;
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: 'Completed' | 'Pending' | 'Overdue' | 'In Progress';
}

export interface ProjectSummary {
  id: string;
  title: string;
  members: string[];
  hours: number;
  progress: number;
  status: 'In Progress' | 'Pending' | 'Overdue' | 'Completed';
  dueDate: string;
}

export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  avatar: string;
  status: 'Online' | 'Offline';
  lastSeen: string;
  workingHours: { day: string, hours: string, percent: number }[];
  totalProjects: number;
}

// --- Mock Data ---

const MOCK_STATS: DashboardStats = {
  completedProjects: 15,
  totalHours: 20,
  overdueProjects: 5,
  latestCheckIn: '12:32 PM',
  pendingTimesheets: 3,
};

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: 'Home Page',
    progress: 90,
    preview: 'stats',
    updatedAt: '12 Apr 2026 • 10:30 AM',
  },
  {
    id: '2',
    title: 'Web Design',
    progress: 60,
    preview: 'projects',
    updatedAt: '10 Apr 2026 • 3:15 PM',
  },
  {
    id: '3',
    title: 'Dashboard Design',
    progress: 25,
    preview: 'tracker',
    updatedAt: '8 Apr 2026 • 9:00 AM',
  },
  {
    id: '4',
    title: 'Mobile App',
    progress: 60,
    preview: 'timesheet',
    updatedAt: '5 Apr 2026 • 11:45 AM',
  },
];

/**
 * To use real screenshots later, add PNGs under src/assets/dashboard-activity/
 * and set `image` on each activity, e.g.:
 *   import homePreview from '@/assets/dashboard-activity/home-page.png';
 *   { ..., image: homePreview }
 */

const MOCK_TIMESHEET: TimesheetEntry[] = [
  { id: '1', employee: 'Arslan Dar', date: 'Jan 2, 2026', checkIn: '12:32 PM', checkOut: '12:33 PM', duration: '0h 1m', status: 'Completed' },
  { id: '2', employee: 'Mubbashar', date: 'Tue, Dec 30', checkIn: '12:32 PM', checkOut: '12:33 PM', duration: '0h 7m', status: 'Completed' },
  { id: '3', employee: 'Ali Hamza', date: 'Tue, Dec 30', checkIn: 'No entries', checkOut: '12:33 PM', duration: '0h 7m', status: 'Completed' },
  { id: '4', employee: 'Hammad', date: 'Tue, Dec 30', checkIn: '12:32 PM', checkOut: '12:33 PM', duration: '0h 7m', status: 'Pending' },
];

const MOCK_PROJECTS: ProjectSummary[] = [
  { id: '01', title: 'Home Page', members: ['A', 'B', 'C'], hours: 20, progress: 25, status: 'In Progress', dueDate: 'Jan-10-2025' },
  { id: '02', title: 'Web Design', members: ['D', 'E'], hours: 20, progress: 50, status: 'In Progress', dueDate: 'Feb-24-2024' },
  { id: '03', title: 'Dashboard Design', members: ['F', 'G'], hours: 20, progress: 70, status: 'Pending', dueDate: 'March-10-2025' },
  { id: '04', title: 'Mobile App', members: ['H', 'I'], hours: 30, progress: 95, status: 'Completed', dueDate: 'April-15-2025' },
];

const DEFAULT_WORKING_HOURS = [
  { day: 'Mon', hours: '7Hr 30m', percent: 94 },
  { day: 'Tue', hours: '5Hr 00m', percent: 62 },
  { day: 'Wed', hours: '8Hr 00m', percent: 100 },
  { day: 'Thu', hours: '3Hr 30m', percent: 44 },
  { day: 'Fri', hours: '4Hr 50m', percent: 60 },
  { day: 'Sat', hours: '0Hr 00m', percent: 0 },
  { day: 'Sun', hours: '0Hr 00m', percent: 0 },
];

const MOCK_PROFILES: Record<string, MemberProfile> = {
  '1': {
    id: '1', firstName: 'Drew', lastName: 'Cano', name: 'Drew Cano', role: 'Product Designer',
    email: 'drew.cano@email.com', phone: '0322 3232560', department: 'Design', position: 'UI/UX Designer',
    avatar: 'https://i.pravatar.cc/150?u=1', status: 'Online', lastSeen: 'Active now',
    workingHours: DEFAULT_WORKING_HOURS, totalProjects: 47
  },
  '2': {
    id: '2', firstName: 'Zahir', lastName: 'Mays', name: 'Zahir Mays', role: 'Product Designer',
    email: 'zahir.mays@email.com', phone: '0323 4455667', department: 'Design', position: 'Product Designer',
    avatar: 'https://i.pravatar.cc/150?u=2', status: 'Offline', lastSeen: 'today on 7:07 am',
    workingHours: DEFAULT_WORKING_HOURS, totalProjects: 32
  },
  '3': {
    id: '3', firstName: 'Rene', lastName: 'Wells', name: 'Rene Wells', role: 'Product Designer',
    email: 'rene.wells@email.com', phone: '0314 9988776', department: 'Design', position: 'UI Architect',
    avatar: 'https://i.pravatar.cc/150?u=3', status: 'Online', lastSeen: 'Active now',
    workingHours: DEFAULT_WORKING_HOURS, totalProjects: 58
  },
  'rafiqur': {
    id: 'rafiqur', firstName: 'Rafiqur', lastName: 'Rehman', name: 'Rafiqur Rehman', role: 'Product Designer',
    email: 'rafiqur@email.com', phone: '0322 3232560', department: 'Design', position: 'UI/UX Designer',
    avatar: 'https://i.pravatar.cc/150?u=rafiqur', status: 'Offline', lastSeen: 'today on 7:07 am',
    workingHours: DEFAULT_WORKING_HOURS, totalProjects: 47
  }
};

// --- Hooks ---

export const useGetDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(r => setTimeout(r, 800));
      return MOCK_STATS;
    },
    staleTime: 300000,
  });
};

export const useGetRecentActivity = () => {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 600));
      return MOCK_ACTIVITIES;
    },
    staleTime: 300000,
  });
};

export const useGetTimesheet = () => {
  return useQuery({
    queryKey: ['timesheet'],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1000));
      return MOCK_TIMESHEET;
    },
    staleTime: 300000,
  });
};

export const useGetProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1200));
      return MOCK_PROJECTS;
    },
    staleTime: 300000,
  });
};

export const useGetMemberProfile = (id: string | undefined) => {
  return useQuery({
    queryKey: ['member-profile', id],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 600));
      if (!id) return MOCK_PROFILES['rafiqur'];
      return MOCK_PROFILES[id] || MOCK_PROFILES['1'];
    },
    staleTime: 300000,
    enabled: true,
  });
};
