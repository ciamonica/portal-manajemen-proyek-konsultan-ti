import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('project_portal_user');
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('project_portal_user', JSON.stringify(user || null));
  }, [user]);

  const login = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }
    setUser(response.data.user);
    localStorage.setItem('project_portal_token', response.data.token);
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem('project_portal_token');
    localStorage.removeItem('project_portal_user');
    setUser(null);
    navigate('/login');
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
