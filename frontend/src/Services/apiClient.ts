import axios from "axios";

// ---- storage helpers (adapt if you already have them) ----
const TOKEN_KEY = "token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (!t) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, t);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  // clear any other auth-related state (user, role, etc.)
  localStorage.removeItem("me");
}

// Optional: decode JWT exp (no deps)
function getJwtExp(token?: string | null): number | null {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload?.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

// ---- axios instance ----
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: false, // set true if you use cookies
});

// attach Authorization header
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// single source of truth to redirect
function forceLoginRedirect(reason?: string) {
  try {
    clearAuth();
    // optional: stash where we were so login can return user back
    const here = window.location.pathname + window.location.search;
    sessionStorage.setItem("postLoginRedirect", here);

    // optional toast
    if (reason && "dispatchEvent" in window) {
      window.dispatchEvent(new CustomEvent("auth:expired", { detail: { reason } }));
    }

    // hard redirect avoids stale state & interceptor loops
    window.location.replace("/auth/signin");
  } catch {
    window.location.href = "/auth/signin";
  }
}

// response error handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    // Unauthenticated or forbidden → logout+redirect
    if (status === 401 || status === 403) {
      forceLoginRedirect(status === 401 ? "expired" : "forbidden");
      return new Promise(() => {}); // stop promise chain
    }

    // Some backends use 419/440 for expired session
    if (status === 419 || status === 440) {
      forceLoginRedirect("expired");
      return new Promise(() => {}); // stop promise chain
    }

    // Network/timeout with protected routes and no token → redirect too
    if (!status) {
      const token = getToken();
      if (!token) {
        forceLoginRedirect("missing");
        return new Promise(() => {}); // stop promise chain
      }
    }

    return Promise.reject(error);
  }
);

// ---- proactive expiry guard (optional but nice UX) ----
let expiryTimer: number | null = null;
export function initAuthExpiryWatcher() {
  if (expiryTimer) window.clearTimeout(expiryTimer);
  const token = getToken();
  const exp = getJwtExp(token);
  if (!exp) return; // token without exp or no token

  const msUntilExp = exp * 1000 - Date.now();
  // logout a bit earlier (e.g., 5s) to avoid racing 401s
  const safety = Math.max(msUntilExp - 5000, 0);

  expiryTimer = window.setTimeout(() => {
    forceLoginRedirect("expired");
  }, safety);
}

// Call this after login / token refresh:
export function setAuthTokenAndStartWatcher(token: string) {
  setToken(token);
  initAuthExpiryWatcher();
}

export default api;
