import { createContext, useState, useEffect, ReactNode } from 'react';
import api, { clearStoredToken, getStoredToken, setStoredToken } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore the session if a token exists in localStorage.
  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      if (!token) {
        // No token stored — user is not logged in.
        setLoading(false);
        return;
      }
      try {
        // The request interceptor in api.ts will attach the Bearer token.
        const res = await api.get<{ data: { user: User } }>('/auth/me');
        setUser(res.data.data.user);
      } catch {
        // Token is expired or invalid — clear it so the user sees the login page.
        clearStoredToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ data: { user: User; token: string } }>('/auth/login', {
      email,
      password,
    });
    // Persist the token so subsequent requests (and page refreshes) are authenticated.
    setStoredToken(res.data.data.token);
    setUser(res.data.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<{ data: { user: User; token: string } }>('/auth/register', {
      name,
      email,
      password,
    });
    setStoredToken(res.data.data.token);
    setUser(res.data.data.user);
  };

  const logout = async () => {
    // Clear the local token immediately so the UI resets even if the backend call fails.
    clearStoredToken();
    setUser(null);
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout is best-effort — local state is already cleared above.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
