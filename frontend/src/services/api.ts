import axios from 'axios';

// ─── API Base URL ────────────────────────────────────────────────────────────
// VITE_API_URL must be set in the Vercel environment variables.
// Defaults to localhost only for local development.
const configuredApiUrl = import.meta.env.VITE_API_URL || '';
const API_URL = configuredApiUrl 
  ? (configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`)
  : '/api';

// Log the resolved URL during development so it's visible in the browser console.
if (import.meta.env.DEV) {
  console.log('[api] Base URL:', API_URL);
}

// ─── Token storage ───────────────────────────────────────────────────────────
// We store the JWT in localStorage instead of relying on httpOnly cookies.
// This avoids all cross-domain SameSite/CORS cookie restrictions when the
// frontend (Vercel) and backend (Render) are on different domains.
const TOKEN_KEY = 'scamshield_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage quota exceeded or private browsing — silently ignore.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore.
  }
}

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  // withCredentials keeps cookie support for local development where cookies work fine.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the token from localStorage to every request as a Bearer token.
// The backend authenticate middleware checks Authorization header first,
// then falls back to the cookie — so both paths work.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ─── Error helper ────────────────────────────────────────────────────────────
/**
 * Extracts a human-readable error message from an API error response.
 *
 * Priority:
 * 1. Backend JSON error message  → { error: { message: "..." } }
 * 2. Network error (CORS, offline, Render sleeping) → clear message
 * 3. Provided fallback
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    // Backend returned a structured error response.
    const backendMessage = error.response?.data?.error?.message;
    if (backendMessage && typeof backendMessage === 'string') {
      return backendMessage;
    }

    // Network-level failure: CORS block, backend offline, Render cold start timeout.
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
      return 'Unable to reach the server. Check your internet connection or try again shortly.';
    }

    // HTTP errors without a structured body.
    if (error.response?.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (error.response?.status === 409) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (error.response?.status === 401) {
      return 'Invalid email or password.';
    }
    if (error.response?.status >= 500) {
      return 'The server encountered an error. Please try again in a moment.';
    }
  }
  return fallback;
}
