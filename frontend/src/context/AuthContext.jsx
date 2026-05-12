import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/api.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem('project_portal_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    localStorage.removeItem('project_portal_user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('project_portal_token');
    if (token) return;
    localStorage.removeItem('project_portal_user');
    setUser(null);
  }, []);

  const login = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }
    localStorage.setItem('project_portal_token', response.data.token);
    localStorage.setItem('project_portal_user', JSON.stringify(response.data.user));
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
