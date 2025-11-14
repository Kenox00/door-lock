import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { getToken, setToken, getUser, setUser, clearStorage } from '../utils/storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const token = getToken();
      const savedUser = getUser();

      if (token && savedUser) {
        setUserState(savedUser);
        setIsAuthenticated(true);
        
        // Verify token is still valid
        try {
          const response = await authApi.getCurrentUser();
          if (response.data) {
            setUserState(response.data);
            setUser(response.data);
          }
        } catch {
          // Token is invalid, clear auth
          await logout();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      
      if (response.data && response.data.token) {
        const { token, user: userData } = response.data;
        
        setToken(token);
        setUser(userData);
        setUserState(userData);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      }
      
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStorage();
      setUserState(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUserState(userData);
    setUser(userData);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
