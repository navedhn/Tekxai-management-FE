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
