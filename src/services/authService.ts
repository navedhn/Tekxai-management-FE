import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
  return apiRequest(API_ENDPOINTS.AUTH.REFRESH, {
    method: 'POST',
    credentials: 'include',
  });
};

const logoutApi = async () => {
  return apiRequest(API_ENDPOINTS.AUTH.LOGOUT, {
    method: 'POST',
    credentials: 'include',
  });
};

const getProfileApi = async () => {
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
