import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Globe, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  User,
  X
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Organization() {
  const { user, activeOrg, userRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Member Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (activeOrg?.id) {
      loadOrgData();
    }
  }, [activeOrg]);

  const loadOrgData = async () => {
    setLoading(true);
    try {
      const [membersData, orgsData] = await Promise.all([
        api.getOrgMembers(activeOrg.id).catch(() => []),
        api.getOrganizations().catch(() => [])
      ]);
      setMembers(membersData);
      setAllOrgs(orgsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');

    try {
      await api.addOrgMember(activeOrg.id, {
        email: inviteEmail,
        role: inviteRole,
      });
      setShowInviteModal(false);
      setInviteEmail('');
      loadOrgData();
    } catch (err) {
      setInviteError(err.message || 'Failed to add member.');
    } finally {
      setInviting(false);
    }
  };

  const handleVerify = async (orgId) => {
    try {
      await api.verifyOrganization(orgId, 'Verified institutional partner by platform authority.');
      loadOrgData();
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(userRole);

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Organization & Trust Directory
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Institution verification, member access governance, and cross-organizational trust federation.
          </p>
        </div>

        {isAdminOrManager && (
          <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
            <UserPlus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* Current Organization Info Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2))',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Building2 size={28} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{activeOrg?.name}</h2>
                {activeOrg?.is_verified ? (
                  <span className="badge badge-success">
                    <ShieldCheck size={12} /> Verified Enterprise
                  </span>
                ) : (
                  <span className="badge badge-warning">Pending Verification</span>
                )}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <Globe size={13} /> Domain: <code className="font-mono">{activeOrg?.domain || 'unconfigured.gov'}</code>
                <span>&bull;</span>
                <span>Active Members: {members.length}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {userRole === 'ADMIN' && !activeOrg?.is_verified && (
              <button onClick={() => handleVerify(activeOrg.id)} className="btn btn-outline btn-sm">
                <ShieldCheck size={14} color="var(--accent-emerald)" /> Certify Organization
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Section: Members Roster & Trust Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem' }}>
        
        {/* Left Column: Organization Members */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Member Roster ({members.length})</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    color: 'var(--accent-emerald)',
                  }}>
                    {m.user_name ? m.user_name[0] : (m.user_email[0].toUpperCase())}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {m.user_name || m.user_email}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {m.user_email}
                    </div>
                  </div>
                </div>

                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Inter-Agency Trust Directory */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Federated Partner Directory</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {allOrgs.map((org) => {
              const isCurrent = org.id === activeOrg?.id;
              return (
                <div
                  key={org.id}
                  style={{
                    padding: '0.85rem 1rem',
                    background: isCurrent ? 'rgba(16, 185, 129, 0.06)' : 'rgba(0,0,0,0.2)',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      <span>{org.name}</span>
                      {isCurrent && <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Current</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                      Domain: <code className="font-mono">{org.domain || 'N/A'}</code>
                    </div>
                  </div>

                  <div>
                    {org.is_verified ? (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Add Member Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Organization Member</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit}>
              <div className="modal-body">
                {inviteError && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: '#FB7185', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {inviteError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">User Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. member@institution.gov"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    User must already have an account in the SecureShare platform.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Organization Role</label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="MEMBER">Member (Standard Access)</option>
                    <option value="MANAGER">Manager (Can Approve Shares)</option>
                    <option value="SECURITY_OFFICER">Security Officer (SOC & Integrity)</option>
                    <option value="ADMIN">Organization Administrator</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={inviting} className="btn btn-primary">
                  {inviting ? 'Adding Member...' : 'Confirm Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
