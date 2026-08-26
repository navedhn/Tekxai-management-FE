// Public, unauthenticated candidate offer review/accept/reject. Mirrors
// hrDocumentsPublicService.ts exactly — no auth token is attached (see
// src/lib/queryClient.ts), and every call resolves strictly off the
// candidate's invite token (the same token send_offer() emails today at
// `/offer/:id?token=:invite_token` — see onboarding.controller.js).
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from './api/endpoints';

export const getPublicOfferApi = async (token: string) => {
  return apiRequest(API_ENDPOINTS.ONBOARDING_OFFERS_PUBLIC.DETAIL(token));
};

export const acceptPublicOfferApi = async (token: string) => {
  return apiRequest(API_ENDPOINTS.ONBOARDING_OFFERS_PUBLIC.ACCEPT(token), {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

// `reason` is optional — matches the backend's optional req.body.reason.
export const rejectPublicOfferApi = async (token: string, payload: { reason?: string }) => {
  return apiRequest(API_ENDPOINTS.ONBOARDING_OFFERS_PUBLIC.REJECT(token), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const useGetPublicOfferQuery = (token: string) => {
  return useQuery({
    queryKey: ['onboarding-offers-public', token],
    queryFn: () => getPublicOfferApi(token),
    enabled: !!token,
    retry: false,
  });
};

export const useAcceptPublicOfferMutation = (token: string) => {
  return useMutation({
    mutationFn: () => acceptPublicOfferApi(token),
  });
};

export const useRejectPublicOfferMutation = (token: string) => {
  return useMutation({
    mutationFn: (payload: { reason?: string }) => rejectPublicOfferApi(token, payload),
  });
};
