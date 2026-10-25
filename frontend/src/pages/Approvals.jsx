import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Building2, 
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Approvals() {
  const { user, activeOrg, userRole } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  // Decision Modal
  const [activeApproval, setActiveApproval] = useState(null);
  const [decisionType, setDecisionType] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [decisionNotes, setDecisionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, [statusFilter, activeOrg]);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovals(statusFilter);
      setApprovals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!activeApproval) return;
    setProcessing(true);

    try {
      await api.decideApproval(activeApproval.id, decisionType, decisionNotes);
      setActiveApproval(null);
      setDecisionNotes('');
      loadApprovals();
    } catch (err) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const canApprove = ['ADMIN', 'SECURITY_OFFICER', 'MANAGER'].includes(userRole);

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Compliance & Security Approval Queue
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Dual-control governance for cross-institutional sensitive document transfers.
          </p>
        </div>

        {!canApprove && (
          <div style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.8rem',
            color: 'var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            <span>Read-Only mode. Approval decisions require Security Officer or Manager role.</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setStatusFilter('PENDING')}
        >
          <Clock size={16} /> Pending Approval
        </button>
        <button
          className={`tab-btn ${statusFilter === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('APPROVED')}
        >
          <CheckCircle2 size={16} /> Approved Requests
        </button>
        <button
          className={`tab-btn ${statusFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('REJECTED')}
        >
          <XCircle size={16} /> Rejected Requests
        </button>
      </div>

      {/* Approvals Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Loading approval requests...
          </div>
        ) : approvals.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <CheckSquare size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No {statusFilter.toLowerCase()} requests</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              {statusFilter === 'PENDING' 
                ? 'All cross-organization share requests have been evaluated.' 
                : `No ${statusFilter.toLowerCase()} requests found in this organization.`}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Target Partner</th>
                  <th>Requested By</th>
                  <th>Permission Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => {
                  const share = app.share_detail;
                  return (
                    <tr key={app.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="var(--accent-emerald)" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {share?.document_title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              Classification: <strong style={{ color: 'var(--accent-amber)' }}>{share?.document_classification}</strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                          <Building2 size={14} color="var(--accent-cyan)" />
                          <span>{share?.recipient_org_name}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {share?.recipient_email || 'Organization-wide'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{app.requested_by_name || app.requested_by_email}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {share?.permission?.replace('_', ' ')}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${app.status === 'APPROVED' ? 'badge-success' : app.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {app.status}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {app.status === 'PENDING' && canApprove ? (
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => { setActiveApproval(app); setDecisionType('APPROVE'); }}
                              className="btn btn-primary btn-sm"
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              onClick={() => { setActiveApproval(app); setDecisionType('REJECT'); }}
                              className="btn btn-danger btn-sm"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {app.decision_by_name ? `By ${app.decision_by_name}` : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {activeApproval && (
        <div className="modal-overlay" onClick={() => setActiveApproval(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {decisionType === 'APPROVE' ? (
                  <CheckCircle2 size={20} color="var(--accent-emerald)" />
                ) : (
                  <XCircle size={20} color="var(--accent-rose)" />
                )}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  {decisionType === 'APPROVE' ? 'Authorize Share Request' : 'Reject Share Request'}
                </h3>
              </div>
              <button onClick={() => setActiveApproval(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit}>
              <div className="modal-body">
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Document</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                    {activeApproval.share_detail?.document_title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Recipient: <strong style={{ color: 'var(--accent-cyan)' }}>{activeApproval.share_detail?.recipient_org_name}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Compliance & Decision Notes {decisionType === 'REJECT' ? '(Required)' : '(Optional)'}
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder={decisionType === 'APPROVE' ? "e.g. Cleared under inter-agency collaboration agreement..." : "e.g. Classification exceeds external sharing clearance..."}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    required={decisionType === 'REJECT'}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setActiveApproval(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`btn ${decisionType === 'APPROVE' ? 'btn-primary' : 'btn-danger'}`}
                >
                  {processing ? 'Recording Decision...' : (decisionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
