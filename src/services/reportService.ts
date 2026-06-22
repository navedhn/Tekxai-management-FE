import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
const v1 = 'api/v1';

export const useAttendanceReport = (params?: Record<string,string>) =>
  useQuery({ queryKey: ['report', 'attendance', params], queryFn: async () => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const r = await apiRequest<any>(`${v1}/report/attendance${qs}`);
    return r?.payload || [];
  }});

export const useLeaveReport = (params?: Record<string,string>) =>
  useQuery({ queryKey: ['report', 'leave', params], queryFn: async () => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const r = await apiRequest<any>(`${v1}/report/leave${qs}`);
    return r?.payload || [];
  }});

export const usePerformanceReport = (params?: Record<string,string>) =>
  useQuery({ queryKey: ['report', 'performance', params], queryFn: async () => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const r = await apiRequest<any>(`${v1}/report/performance${qs}`);
    return r?.payload || [];
  }});

export const useProjectsReport = (params?: Record<string,string>) =>
  useQuery({ queryKey: ['report', 'projects', params], queryFn: async () => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const r = await apiRequest<any>(`${v1}/report/projects${qs}`);
    return r?.payload || [];
  }});

export function download_report(type: string, params: Record<string,string>) {
  const qs = new URLSearchParams({ ...params, format: 'csv' }).toString();
  const token = localStorage.getItem('tekxai_access_token');
  const link = document.createElement('a');
  link.href = `/api/v1/report/${type}?${qs}`;
  link.setAttribute('download', `${type}_report.csv`);
  // Note: for authenticated downloads, must pass token header
  fetch(link.href, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${type}_report.csv`; a.click();
      URL.revokeObjectURL(url);
    });
}
