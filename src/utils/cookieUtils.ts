export const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
};

export const setCookie = (
    name: string,
    value: string,
    options: { days?: number; path?: string; sameSite?: 'Lax' | 'Strict' | 'None'; secure?: boolean } = {}
) => {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    const { days, path = '/', sameSite = 'Lax', secure = true } = options;
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        cookie += `; Expires=${date.toUTCString()}`;
    }
    cookie += `; Path=${path}`;
    cookie += `; SameSite=${sameSite}`;
    if (secure) cookie += `; Secure`;
    document.cookie = cookie;
};

export const deleteCookie = (name: string, path: string = '/') => {
    document.cookie = `${encodeURIComponent(name)}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

// Access token helpers
const ACCESS_TOKEN_COOKIE = 'access_token';

export const getAccessTokenFromCookie = (): string | null => getCookie(ACCESS_TOKEN_COOKIE);
export const setAccessTokenCookie = (token: string, days?: number) => setCookie(ACCESS_TOKEN_COOKIE, token, { days, sameSite: 'Lax', secure: true });
export const clearAccessTokenCookie = () => deleteCookie(ACCESS_TOKEN_COOKIE);


