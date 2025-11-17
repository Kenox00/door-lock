import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { getToken, setToken, getUser, setUser, clearStorage } from '../utils/storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) return;
    
    setIsCheckingAuth(true);
    try {
      const token = getToken();
      const savedUser = getUser();

      if (token && savedUser) {
        setUserState(savedUser);
        setIsAuthenticated(true);
        
        // Verify token is still valid only if we have both token and user
        try {
          const response = await authApi.getCurrentUser();
          if (response.data) {
            setUserState(response.data);
            setUser(response.data);
          }
        } catch (error) {
          // Token is invalid, clear auth silently
          console.log('Token verification failed:', error.message);
          clearStorage();
          setUserState(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearStorage();
      setUserState(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      setIsCheckingAuth(false);
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
    // Clear auth state immediately to prevent loops
    const wasAuthenticated = isAuthenticated;
    setUserState(null);
    setIsAuthenticated(false);
    clearStorage();
    
    // Only call logout API if we were actually authenticated
    if (wasAuthenticated) {
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
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
