export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string | null | undefined) => localStorage.setItem('token', token ?? '');
export const clearToken = () => localStorage.removeItem('token');

