/**
 * Shared utility for attendance auto-checkout.
 *
 * - forceCheckoutApi: raw fetch call (no React, safe to call anywhere including
 *   logout handlers that run outside React component trees)
 * - IDLE_CHECKOUT_FLAG: localStorage key used to signal that an idle auto-checkout
 *   happened so the resume modal can appear on next load
 */

import { getAccessToken } from './tokenMemory';
import { BASE_URL } from '@/lib/apiConfig';
import { API_ENDPOINTS } from '@/services/api/endpoints';

export type CheckoutReason = 'LOGOUT' | 'IDLE_TIMEOUT' | 'MANUAL';

export const IDLE_CHECKOUT_FLAG = 'tekxai:idle_auto_checkout';

/**
 * Call the force-checkout endpoint directly (no TanStack Query).
 * Silently swallows errors — this is called in fire-and-forget contexts
 * like logout flows where we must not block the UX.
 */
export async function forceCheckoutApi(reason: CheckoutReason): Promise<void> {
  try {
    const token = getAccessToken();
    if (!token) return;
    await fetch(`${BASE_URL}${API_ENDPOINTS.TIMESHEET.FORCE_CHECKOUT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
  } catch {
    // Silently ignore — network may be unavailable during logout
  }
}

/**
 * Mark that an idle auto-checkout occurred.
 * The IdleAutoCheckoutModal reads this on mount and shows the re-check-in prompt.
 */
export function setIdleCheckoutFlag(): void {
  localStorage.setItem(IDLE_CHECKOUT_FLAG, String(Date.now()));
}

export function clearIdleCheckoutFlag(): void {
  localStorage.removeItem(IDLE_CHECKOUT_FLAG);
}

export function hasIdleCheckoutFlag(): boolean {
  return !!localStorage.getItem(IDLE_CHECKOUT_FLAG);
}
