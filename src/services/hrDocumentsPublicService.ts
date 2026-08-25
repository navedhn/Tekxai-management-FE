// Public candidate e-signature signing link. No auth token is attached to
// these calls (apiRequest only adds one if a session token exists — see
// src/lib/queryClient.ts) — this must keep working for a signed-out visitor.
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export const getPublicDocumentApi = async (token: string) => {
  return apiRequest(API_ENDPOINTS.HR_DOCUMENTS_PUBLIC.DETAIL(token));
};

// Deliberately never accepts a recipient/user/candidate id — the token
// alone determines who/what is being signed (see hr-documents-public
// controller on the backend for the matching server-side rejection).
export const signPublicDocumentApi = async (token: string, payload: { signature_data: string }) => {
  return apiRequest(API_ENDPOINTS.HR_DOCUMENTS_PUBLIC.SIGN(token), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const useGetPublicDocumentQuery = (token: string) => {
  return useQuery({
    queryKey: ['hr-documents-public', token],
    queryFn: () => getPublicDocumentApi(token),
    enabled: !!token,
    retry: false,
  });
};

export const useSignPublicDocumentMutation = (token: string) => {
  return useMutation({
    mutationFn: (payload: { signature_data: string }) => signPublicDocumentApi(token, payload),
  });
};
