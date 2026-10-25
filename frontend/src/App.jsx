import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Sharing from './pages/Sharing';
import Approvals from './pages/Approvals';
import SecurityCenter from './pages/SecurityCenter';
import AuditLogs from './pages/AuditLogs';
import Organization from './pages/Organization';

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent-emerald)',
        fontSize: '1.1rem',
        fontWeight: 600,
        gap: '0.75rem',
      }}>
        <span className="pulse-dot emerald" style={{ width: '12px', height: '12px' }}></span>
        <span>Initializing Encrypted Vault Environment...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/sharing" element={<Sharing />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/security" element={<SecurityCenter />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/organization" element={<Organization />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
