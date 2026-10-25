import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, getAuthToken } from '../api';

const AuthContext = createContext(null);

export const TEST_USERS = [
  {
    email: 'alex@aegis.gov',
    password: 'SecureShare123!',
    name: 'Alex Vance',
    role: 'Security Officer',
    org: 'Aegis Aerospace & Defense',
    tag: 'SOC / SecOps'
  },
  {
    email: 'elena@aegis.gov',
    password: 'SecureShare123!',
    name: 'Dr. Elena Rostova',
    role: 'Admin / Lead Architect',
    org: 'Aegis Aerospace & Defense',
    tag: 'Owner & Admin'
  },
  {
    email: 'marcus@nexus.org',
    password: 'SecureShare123!',
    name: 'Dr. Marcus Chen',
    role: 'Manager',
    org: 'Nexus BioTech Labs',
    tag: 'Cross-Org Recipient'
  },
  {
    email: 'sarah@apex.com',
    password: 'SecureShare123!',
    name: 'Sarah Jenkins',
    role: 'Member / Auditor',
    org: 'Apex Global Financial',
    tag: 'Financial Compliance'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getMe();
        setUser(userData);
        fetchUnreadCount();
      } catch (err) {
        console.error('Failed to load user', err);
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.getUnreadCount();
      setUnreadCount(res.count);
    } catch {
      // ignore
    }
  };

  const login = async (usernameOrEmail, password) => {
    const res = await api.login({
      username_or_email: usernameOrEmail,
      password: password,
    });
    setAuthToken(res.token);
    setUser(res.user);
    fetchUnreadCount();
    return res.user;
  };

  const register = async (data) => {
    const res = await api.register(data);
    setAuthToken(res.token);
    setUser(res.user);
    fetchUnreadCount();
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout error', e);
    }
    setAuthToken(null);
    setUser(null);
  };

  const switchOrganization = async (orgId) => {
    const res = await api.setActiveOrg(orgId);
    setUser(res.user);
    return res.user;
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      fetchUnreadCount();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadCount,
        login,
        register,
        logout,
        switchOrganization,
        refreshUser,
        fetchUnreadCount,
        activeOrg: user?.active_organization_detail,
        userRole: user?.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
