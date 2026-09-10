import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
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

// Canonical Projects Report (Delivery/Milestones/Client Health/Exceptions)
// — one aggregation call, server-computed. See be-work's
// projects-report.service.js for exactly what each field means; the
// `definitions` key in the response is the single source the UI's legend
// renders from, so it can never drift from the actual calculation.
export const useProjectsReportSummary = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['report', 'projects-summary', params],
    queryFn: async () => {
      const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
      const r = await apiRequest<any>(`${v1}/report/projects/summary${qs}`);
      return r?.payload;
    },
  });

export const useProjectsReportRecipients = () =>
  useQuery({
    queryKey: ['report', 'projects-recipients'],
    queryFn: async () => {
      const r = await apiRequest<any>(`${v1}/report/projects/recipients`);
      return r?.payload?.records || [];
    },
  });

export const useProjectsReportEmailPreview = (params: Record<string, string>, enabled: boolean) =>
  useQuery({
    queryKey: ['report', 'projects-email-preview', params],
    queryFn: async () => {
      const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
      const r = await apiRequest<any>(`${v1}/report/projects/email-preview${qs}`);
      return r?.payload as { subject: string; html: string };
    },
    enabled,
  });

export const useSendProjectsReportEmail = () =>
  useMutation({
    mutationFn: (body: { recipient_ids?: string[]; extra_emails?: string[] } & Record<string, unknown>) =>
      apiRequest<any>(`${v1}/report/projects/send-email`, { method: 'POST', body: JSON.stringify(body) }),
  });

export function download_report(type: string, params: Record<string,string>) {
  const qs = new URLSearchParams({ ...params, format: 'csv' }).toString();
  const token = localStorage.getItem('tekxai_access_token');
  const link = document.createElement('a');
  link.href = `/api/v1/report/${type}?${qs}`;
  link.setAttribute('download', `${type}_report.csv`);

  fetch(link.href, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${type}_report.csv`; a.click();
      URL.revokeObjectURL(url);
    });
}
