import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const API_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

/**
 * Extracts a human-readable error message from an API error response.
 *
 * Priority:
 * 1. Backend JSON error message  → { error: { message: "..." } }
 * 2. Network error (CORS, offline, Render sleeping) → clear message
 * 3. Provided fallback
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    // Backend returned a structured error response
    const backendMessage = error.response?.data?.error?.message;
    if (backendMessage && typeof backendMessage === 'string') {
      return backendMessage;
    }

    // Network-level failure: CORS block, backend offline, Render cold start timeout
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
      return 'Unable to reach the server. Check your internet connection or try again shortly.';
    }

    // HTTP error without a structured body
    if (error.response?.status === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (error.response?.status === 409) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (error.response?.status >= 500) {
      return 'The server encountered an error. Please try again in a moment.';
    }
  }
  return fallback;
}
