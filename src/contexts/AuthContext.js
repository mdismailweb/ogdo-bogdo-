import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true); // Add a loading state

  // This useEffect will run only once when the app starts
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('userRole');

      if (storedUser && storedRole) {
        setUser(JSON.parse(storedUser));
        setUserRole(storedRole);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      // If parsing fails, clear the storage to be safe
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    } finally {
      setLoading(false); // We are done loading the user state
    }
  }, []); // The empty array [] ensures this runs only on mount

  const login = (userData, role) => {
    setUser(userData);
    setUserRole(role);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userRole', role);
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
  };

  const value = { user, userRole, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children until the user state has been loaded from storage */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
