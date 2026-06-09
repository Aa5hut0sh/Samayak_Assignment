'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
};

const AuthContext = createContext<{
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  logout: () => void;
  isLoading: boolean;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/auth/me");
          setAuth({ user: res.data.user, isAuthenticated: true });
        } catch (error) {
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    setAuth({ user: null, isAuthenticated: false });
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};