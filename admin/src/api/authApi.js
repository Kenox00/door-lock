import axiosClient from './axiosClient';

export const authApi = {
  login: async (credentials) => {
    const response = await axiosClient.post('/auth/login', credentials);
    return response;
  },

  getCurrentUser: async () => {
    const response = await axiosClient.get('/auth/me');
    return response;
  },

  logout: async () => {
    const response = await axiosClient.post('/auth/logout');
    return response;
  },

  register: async (userData) => {
    const response = await axiosClient.post('/auth/register', userData);
    return response;
  },
};
