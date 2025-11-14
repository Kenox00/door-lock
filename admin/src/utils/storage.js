// Token management
const TOKEN_KEY = 'smart_home_token';
const USER_KEY = 'smart_home_user';
const PREFERENCES_KEY = 'smart_home_preferences';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// User management
export const getUser = () => {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const setUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user:', error);
  }
};

export const removeUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

// Preferences management
export const getPreferences = () => {
  try {
    const preferences = localStorage.getItem(PREFERENCES_KEY);
    return preferences ? JSON.parse(preferences) : {};
  } catch (error) {
    console.error('Error getting preferences:', error);
    return {};
  }
};

export const setPreferences = (preferences) => {
  try {
    const existing = getPreferences();
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...existing, ...preferences }));
  } catch (error) {
    console.error('Error setting preferences:', error);
  }
};

export const removePreferences = () => {
  try {
    localStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    console.error('Error removing preferences:', error);
  }
};

// Clear all storage
export const clearStorage = () => {
  try {
    removeToken();
    removeUser();
    removePreferences();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};
