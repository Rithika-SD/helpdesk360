import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('helpdesk_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('helpdesk_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('helpdesk_user', JSON.stringify(res.user));
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    }

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    verifyAuth();

    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [token]);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('helpdesk_token', res.token);
    localStorage.setItem('helpdesk_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    try {
      api.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('helpdesk_token');
      localStorage.removeItem('helpdesk_user');
    }
  };

  const isTechnician = user?.role === 'technician';
  const isEmployee = user?.role === 'employee';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isTechnician,
        isEmployee,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
