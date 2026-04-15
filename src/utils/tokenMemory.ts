/**
 * Persistent Token Management
 * 
 * Stores the access token in localStorage for persistence across reloads.
 * This ensures that refreshing the page does not log the user out.
 * 
 * The refresh token is managed by the server via HttpOnly cookies.
 */

const TOKEN_KEY = 'tekxai_access_token';

/**
 * Get the current access token from memory
 * @returns The access token or null if not set
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set the access token in memory
 * @param token - The access token to store, or null to clear
 */
export const setAccessToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

/**
 * Clear the access token from memory
 */
export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

