import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderLock, 
  Share2, 
  CheckSquare, 
  ShieldAlert, 
  History, 
  Building,
  Key,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { userRole } = useAuth();
  const isSecurityOrAdmin = ['ADMIN', 'SECURITY_OFFICER'].includes(userRole);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Document Vault', icon: FolderLock },
    { to: '/sharing', label: 'Cross-Org Sharing', icon: Share2 },
    { to: '/approvals', label: 'Approval Queue', icon: CheckSquare },
    { to: '/security', label: 'Security Center (SOC)', icon: ShieldAlert },
    { to: '/audit', label: 'Immutable Audit Trail', icon: History },
    { to: '/organization', label: 'Organization & Trust', icon: Building },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      gap: '0.35rem',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '0 0.75rem 1rem 0.75rem',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-dim)',
      }}>
        Navigation
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                background: isActive ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(6, 182, 212, 0.12))' : 'transparent',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Security Status Box in Sidebar bottom */}
      <div style={{
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '0.3rem' }}>
          <span className="pulse-dot emerald"></span>
          <span>Zero-Knowledge Vault</span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
          DEKs protected with envelope encryption. SHA-256 integrity checks enforced per transaction.
        </p>
      </div>
    </aside>
  );
}
