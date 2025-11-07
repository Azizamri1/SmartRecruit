/**
 * Centralized API client with authentication handling.
 * Manages JWT tokens, automatic login redirects, and request/response interceptors.
 */

import axios from "axios";

// Local storage keys for authentication data
const TOKEN_KEY = "token";

/**
 * Authentication token management functions.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  // Clear any other authentication-related data
  localStorage.removeItem("me");
}

/**
 * Extract JWT expiration timestamp from token payload.
 */
function getJwtExpiration(token?: string | null): number | null {
  try {
    if (!token) return null;

    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload?.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Axios instance configured for API communication.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: false, // Set to true if using cookies for authentication
});

/**
 * Request interceptor to automatically add JWT token to requests.
 */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Force redirect to login page and clear authentication state.
 */
function forceLoginRedirect(reason?: string): void {
  try {
    clearAuth();

    // Save current location for post-login redirect
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem("postLoginRedirect", currentPath);

    // Dispatch event for UI notifications (e.g., toast messages)
    if (reason && "dispatchEvent" in window) {
      window.dispatchEvent(new CustomEvent("auth:expired", { detail: { reason } }));
    }

    // Use replace to avoid back button issues and prevent interceptor loops
    window.location.replace("/auth/signin");
  } catch {
    // Fallback for environments without replace support
    window.location.href = "/auth/signin";
  }
}

/**
 * Response interceptor to handle authentication errors and redirects.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Handle authentication failures
    if (status === 401 || status === 403) {
      const reason = status === 401 ? "expired" : "forbidden";
      forceLoginRedirect(reason);
      return new Promise(() => {}); // Stop promise chain
    }

    // Handle alternative session expiry status codes
    if (status === 419 || status === 440) {
      forceLoginRedirect("expired");
      return new Promise(() => {}); // Stop promise chain
    }

    // Handle network errors on protected routes without tokens
    if (!status) {
      const token = getToken();
      if (!token) {
        forceLoginRedirect("missing");
        return new Promise(() => {}); // Stop promise chain
      }
    }

    return Promise.reject(error);
  }
);

// ---- proactive expiry guard (optional but nice UX) ----
let expiryTimer: number | null = null;
/**
 * Initialize automatic logout timer based on JWT expiration.
 * Logs out user slightly before token expires to prevent 401 errors.
 */
export function initAuthExpiryWatcher(): void {
  if (expiryTimer) window.clearTimeout(expiryTimer);

  const token = getToken();
  const expiration = getJwtExpiration(token);
  if (!expiration) return; // No token or token without expiration

  const msUntilExpiration = expiration * 1000 - Date.now();
  // Log out 5 seconds early to avoid racing with 401 responses
  const safetyBuffer = Math.max(msUntilExpiration - 5000, 0);

  expiryTimer = window.setTimeout(() => {
    forceLoginRedirect("expired");
  }, safetyBuffer);
}

// Call this after login / token refresh:
export function setAuthTokenAndStartWatcher(token: string) {
  setToken(token);
  initAuthExpiryWatcher();
}

export default api;
