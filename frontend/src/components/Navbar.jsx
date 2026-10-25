import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  ChevronDown, 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Check, 
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const { user, activeOrg, userRole, logout, switchOrganization, unreadCount } = useAuth();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <header style={{
      height: '68px',
      background: 'rgba(17, 24, 39, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Left: Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
        }}>
          <ShieldCheck size={22} color="var(--accent-emerald)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#FFFFFF' }}>SecureShare</span>
            <span style={{ 
              fontSize: '0.65rem', 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: 'var(--accent-emerald)', 
              padding: '0.1rem 0.45rem', 
              borderRadius: '4px',
              fontWeight: 700,
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              AES-256-GCM
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>Cross-Org Cryptographic Vault</p>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Active Organization Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.85rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Building2 size={16} color="var(--accent-cyan)" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Org
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {activeOrg?.name || 'No Organization'}
                {activeOrg?.verification_status === 'VERIFIED' && (
                  <span title="Verified Enterprise" style={{ color: 'var(--accent-emerald)', fontSize: '0.75rem' }}>✓</span>
                )}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-dim)" />
          </button>

          {showOrgDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.5rem',
              width: '260px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.5rem',
              zIndex: 100,
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', padding: '0.35rem 0.6rem', textTransform: 'uppercase' }}>
                Available Organizations
              </div>
              {user?.available_organizations?.map((org) => {
                const isSelected = activeOrg?.id === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setShowOrgDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.6rem',
                      background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: isSelected ? 'var(--accent-emerald)' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                    }}
                  >
                    <div>
                      <div>{org.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Role: {org.role}</div>
                    </div>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User Role Tag */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.75rem',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
        }}>
          <Lock size={13} color="var(--accent-amber)" />
          <span style={{ color: 'var(--text-muted)' }}>Role:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{userRole || 'Member'}</span>
        </div>

        {/* Notifications Icon with Counter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              padding: '0.5rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                background: 'var(--accent-rose)',
                color: '#FFF',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown isOpen={showNotifs} onClose={() => setShowNotifs(false)} />
        </div>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald)',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {user?.full_name ? user.full_name[0] : (user?.username?.[0] || 'U')}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '0.35rem',
              marginLeft: '0.25rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
