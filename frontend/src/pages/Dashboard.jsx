import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderLock, 
  Share2, 
  CheckSquare, 
  ShieldAlert, 
  Lock, 
  Upload, 
  ArrowUpRight, 
  FileText, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  History,
  Download
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, activeOrg } = useAuth();
  const [metrics, setMetrics] = useState({
    encrypted_documents_count: 0,
    active_external_shares_count: 0,
    active_alerts_count: 0,
    critical_alerts_count: 0,
    failed_access_attempts_24h: 0,
  });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [recentDocs, setRecentDocs] = useState([]);
  const [recentAudit, setRecentAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [activeOrg]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [secMetrics, docs, approvals, audits] = await Promise.all([
        api.getSecurityMetrics().catch(() => ({})),
        api.getDocuments().catch(() => []),
        api.getApprovals('PENDING').catch(() => []),
        api.getAuditLogs({ limit: 6 }).catch(() => [])
      ]);

      setMetrics(secMetrics);
      setRecentDocs(docs.slice(0, 5));
      setPendingApprovalsCount(approvals.length);
      setRecentAudit(audits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getClassificationBadge = (cls) => {
    switch (cls) {
      case 'HIGHLY_CONFIDENTIAL':
        return <span className="badge badge-highly-confidential">Highly Confidential</span>;
      case 'CONFIDENTIAL':
        return <span className="badge badge-confidential">Confidential</span>;
      case 'INTERNAL':
        return <span className="badge badge-internal">Internal</span>;
      default:
        return <span className="badge badge-public">Public</span>;
    }
  };

  return (
    <div className="page-body">
      {/* Top Welcome & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Security Command Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Operating inside encrypted vault for <strong style={{ color: 'var(--text-main)' }}>{activeOrg?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/documents" className="btn btn-primary">
            <Upload size={16} /> Upload Encrypted Doc
          </Link>
          <Link to="/sharing" className="btn btn-secondary">
            <Share2 size={16} /> Cross-Org Share
          </Link>
        </div>
      </div>

      {/* Cryptographic Protection Banner */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={20} color="var(--accent-emerald)" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>
              Zero-Plaintext Envelope Encryption Active
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Master Key Encryption Key (KEK) + Unique 256-bit DEK per document version. GCM Authenticated.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
            <span className="pulse-dot emerald"></span> System Normal
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            FIPS 140-2 Compatible
          </span>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        {/* Card 1: Documents */}
        <Link to="/documents" style={{ textDecoration: 'none' }}>
          <div className="glass-panel glass-panel-interactive" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Encrypted Documents</span>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--accent-cyan-dim)' }}>
                <FolderLock size={18} color="var(--accent-cyan)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              {metrics.encrypted_documents_count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldCheck size={14} /> In Vault Storage
            </div>
          </div>
        </Link>

        {/* Card 2: Cross Org Shares */}
        <Link to="/sharing" style={{ textDecoration: 'none' }}>
          <div className="glass-panel glass-panel-interactive" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active External Shares</span>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)' }}>
                <Share2 size={18} color="var(--accent-purple)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
              {metrics.active_external_shares_count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Cross-Institutional Channels
            </div>
          </div>
        </Link>

        {/* Card 3: Pending Approvals */}
        <Link to="/approvals" style={{ textDecoration: 'none' }}>
          <div className="glass-panel glass-panel-interactive" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Approvals</span>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--accent-amber-dim)' }}>
                <CheckSquare size={18} color="var(--accent-amber)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: pendingApprovalsCount > 0 ? 'var(--accent-amber)' : 'var(--text-main)', marginBottom: '0.2rem' }}>
              {pendingApprovalsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: pendingApprovalsCount > 0 ? 'var(--accent-amber)' : 'var(--text-dim)' }}>
              {pendingApprovalsCount > 0 ? 'Requires Compliance Action' : 'All Requests Cleared'}
            </div>
          </div>
        </Link>

        {/* Card 4: Security Alerts */}
        <Link to="/security" style={{ textDecoration: 'none' }}>
          <div className="glass-panel glass-panel-interactive" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Security Alerts (SOC)</span>
              <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'var(--accent-rose-dim)' }}>
                <ShieldAlert size={18} color="var(--accent-rose)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: metrics.active_alerts_count > 0 ? 'var(--accent-rose)' : 'var(--text-main)', marginBottom: '0.2rem' }}>
              {metrics.active_alerts_count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: metrics.critical_alerts_count > 0 ? 'var(--accent-rose)' : 'var(--text-dim)' }}>
              {metrics.critical_alerts_count > 0 ? `${metrics.critical_alerts_count} Critical Incident(s)` : 'No Critical Incidents'}
            </div>
          </div>
        </Link>
      </div>

      {/* Main 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.75rem' }}>
        
        {/* Left Column: Recent Encrypted Documents */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderLock size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Vault Encrypted Documents</h3>
            </div>
            <Link to="/documents" style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentDocs.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              No documents in this organization's vault yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-card-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <FileText size={15} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <span>v{doc.latest_version?.version_number || 1}</span>
                      <span>&bull;</span>
                      <span>{doc.owner_email}</span>
                    </div>
                  </div>
                  <div>
                    {getClassificationBadge(doc.classification)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Live Audit Activity */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Immutable Audit Feed</h3>
            </div>
            <Link to="/audit" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Full Log <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentAudit.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              No audit events recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentAudit.map((e) => (
                <div
                  key={e.id}
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
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                      {e.event_type_display || e.event_type}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      By: <span style={{ color: 'var(--text-muted)' }}>{e.actor_email || 'System'}</span> &bull; {e.resource_name || e.resource_type}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${e.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                      {e.outcome}
                    </span>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
