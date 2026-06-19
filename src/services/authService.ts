import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { refreshAccessToken } from '@/lib/authSession';
import { getRefreshToken } from '@/utils/tokenMemory';
import { isMockAuthEnabled, isMockSession, mockLogin } from '@/mocks/mockAuth';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// --- Types & DTOs ---

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterDto = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  role_id: string;
  department: string;
  position: string;
};

export type ForgetPasswordDto = {
  email: string;
};

export type VerifyOTPDto = {
  id: string | number;
  otp: string;
};

export type ResetPasswordDto = {
  id: string | number;
  password: string;
};

// --- API Functions ---

const loginApi = async (credentials: LoginCredentials) => {
  if (isMockAuthEnabled()) {
    return mockLogin(credentials.email, credentials.password);
  }

  return apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
};

const registerApi = async (data: RegisterDto) => {
  return apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

const refreshApi = async () => {
  const accessToken = await refreshAccessToken();
  if (!accessToken) throw new Error('Token refresh failed');
  return { payload: { accessToken } };
};

const logoutApi = async () => {
  if (isMockSession()) {
    return { success: true };
  }

  const refreshToken = getRefreshToken();
  return apiRequest(API_ENDPOINTS.AUTH.LOGOUT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    credentials: 'include',
  });
};

const getProfileApi = async () => {
  if (isMockSession()) {
    return { payload: null };
  }

  return apiRequest(API_ENDPOINTS.AUTH.ME);
};

const forgetPasswordApi = async (data: ForgetPasswordDto) => {
  return apiRequest(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

const verifyOTPApi = async ({ id, otp }: VerifyOTPDto) => {
  return apiRequest(API_ENDPOINTS.AUTH.VERIFY_OTP(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp }),
  });
};

const resendOTPApi = async (id: string | number) => {
  return apiRequest(API_ENDPOINTS.AUTH.RESEND_OTP(id), {
    method: 'GET',
  });
};

const resetPasswordApi = async ({ id, password }: ResetPasswordDto) => {
  return apiRequest(API_ENDPOINTS.AUTH.RESET_PASSWORD(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
};

// --- TanStack Query Hooks ---

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: loginApi,
  });
};

export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: registerApi,
  });
};

export const useRefreshMutation = () => {
  return useMutation({
    mutationFn: refreshApi,
  });
};

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useGetProfileQuery = (enabled: boolean = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.AUTH.PROFILE,
    queryFn: getProfileApi,
    enabled,
  });
};

export const useForgetPasswordMutation = () => {
  return useMutation({
    mutationFn: forgetPasswordApi,
  });
};

export const useVerifyOTPMutation = () => {
  return useMutation({
    mutationFn: verifyOTPApi,
  });
};

export const useResendOTPMutation = () => {
  return useMutation({
    mutationFn: resendOTPApi,
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: resetPasswordApi,
  });
};
