import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Download, 
  Plus, 
  FileText, 
  Building2,
  X
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Sharing() {
  const { user, activeOrg } = useAuth();
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent' | 'requests'
  const [shares, setShares] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Revoke Modal State
  const [revokingShare, setRevokingShare] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [processingRevoke, setProcessingRevoke] = useState(false);

  // New Share Modal State
  const [showNewShareModal, setShowNewShareModal] = useState(false);
  const [userDocs, setUserDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [targetOrgId, setTargetOrgId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [permission, setPermission] = useState('DOWNLOAD_DOCUMENT');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');

  useEffect(() => {
    loadData();
    loadOrgsAndDocs();
  }, [activeTab, activeOrg]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const reqs = await api.getAccessRequests();
        setAccessRequests(reqs);
      } else {
        const data = await api.getShares(activeTab);
        setShares(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgsAndDocs = async () => {
    try {
      const [orgs, docs] = await Promise.all([
        api.getOrganizations(),
        api.getDocuments()
      ]);
      setOrganizations(orgs.filter(o => o.id !== activeOrg?.id));
      setUserDocs(docs);
      if (docs.length > 0) setSelectedDocId(docs[0].id);
      if (orgs.length > 0) setTargetOrgId(orgs.filter(o => o.id !== activeOrg?.id)[0]?.id || '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptShare = async (id) => {
    try {
      await api.acceptShare(id);
      loadData();
    } catch (err) {
      alert(`Accept failed: ${err.message}`);
    }
  };

  const handleRejectShare = async (id) => {
    try {
      await api.rejectShare(id);
      loadData();
    } catch (err) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  const handleRevokeShare = async (e) => {
    e.preventDefault();
    if (!revokingShare) return;
    setProcessingRevoke(true);
    try {
      await api.revokeShare(revokingShare.id, revokeReason);
      setRevokingShare(null);
      setRevokeReason('');
      loadData();
    } catch (err) {
      alert(`Revocation failed: ${err.message}`);
    } finally {
      setProcessingRevoke(false);
    }
  };

  const handleCreateShareSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDocId || !targetOrgId) {
      setShareError('Please select both a document and target partner organization.');
      return;
    }
    setSharing(true);
    setShareError('');

    try {
      await api.createShare({
        document_id: selectedDocId,
        recipient_organization_id: targetOrgId,
        recipient_email: recipientEmail,
        permission: permission,
        requires_approval: requiresApproval,
      });
      setShowNewShareModal(false);
      setRecipientEmail('');
      setActiveTab('sent');
      loadData();
    } catch (err) {
      setShareError(err.message || 'Share creation failed.');
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async (docId) => {
    try {
      const { blob, filename } = await api.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success"><span className="pulse-dot emerald"></span> Active</span>;
      case 'PENDING_APPROVAL':
        return <span className="badge badge-warning"><Clock size={12} /> Pending Approval</span>;
      case 'PENDING_ACCEPTANCE':
        return <span className="badge badge-internal"><Clock size={12} /> Pending Acceptance</span>;
      case 'REVOKED':
        return <span className="badge badge-danger"><Ban size={12} /> Revoked</span>;
      case 'EXPIRED':
        return <span className="badge badge-neutral">Expired</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Cross-Organization Sharing Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Cryptographically controlled inter-institution document sharing and zero-trust permissions.
          </p>
        </div>

        <button onClick={() => setShowNewShareModal(true)} className="btn btn-primary">
          <Share2 size={16} /> New Cross-Org Share
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          <ArrowDownLeft size={16} /> Received Shares
        </button>
        <button
          className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <ArrowUpRight size={16} /> Outgoing Shares
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Clock size={16} /> Access Requests
        </button>
      </div>

      {/* Table Content */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Loading sharing records...
          </div>
        ) : activeTab === 'requests' ? (
          /* Access Requests Table */
          accessRequests.length === 0 ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              No access requests recorded.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Target Document</th>
                    <th>Requester</th>
                    <th>Organization</th>
                    <th>Requested Permission</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600 }}>{req.document_title}</td>
                      <td>{req.requester_name || req.requester_email}</td>
                      <td>{req.org_name}</td>
                      <td><span className="badge badge-neutral">{req.requested_permission}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.reason}</td>
                      <td>
                        <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Shares Table */
          shares.length === 0 ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
              <Share2 size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No {activeTab} shares</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                {activeTab === 'received' 
                  ? 'No external organizations have shared documents with your identity yet.' 
                  : 'You have not dispatched any cross-organization shares.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>{activeTab === 'received' ? 'Sender Organization' : 'Recipient Organization'}</th>
                    <th>Target Entity</th>
                    <th>Permission Level</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => (
                    <tr key={share.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="var(--accent-emerald)" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {share.document_title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              {share.document_classification} &bull; {share.share_type}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                          <Building2 size={14} color="var(--accent-cyan)" />
                          <span>{activeTab === 'received' ? share.sender_org_name : share.recipient_org_name}</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.825rem' }}>
                          {share.recipient_email || share.recipient_user_name || 'All Members'}
                        </div>
                        {share.requires_approval && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--accent-amber)' }}>
                            Requires Security Sign-off
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {share.permission.replace('_', ' ')}
                        </span>
                      </td>

                      <td>{getStatusBadge(share.status)}</td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {activeTab === 'received' && share.status === 'PENDING_ACCEPTANCE' && (
                            <>
                              <button
                                onClick={() => handleAcceptShare(share.id)}
                                className="btn btn-primary btn-sm"
                              >
                                <CheckCircle2 size={13} /> Accept
                              </button>
                              <button
                                onClick={() => handleRejectShare(share.id)}
                                className="btn btn-danger btn-sm"
                              >
                                <XCircle size={13} /> Decline
                              </button>
                            </>
                          )}

                          {activeTab === 'received' && share.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDownload(share.document)}
                              className="btn btn-primary btn-sm"
                            >
                              <Download size={13} /> Decrypt & View
                            </button>
                          )}

                          {activeTab === 'sent' && share.status === 'ACTIVE' && (
                            <button
                              onClick={() => setRevokingShare(share)}
                              className="btn btn-danger btn-sm"
                              title="Immediately revoke recipient's access"
                            >
                              <Ban size={13} /> Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Revoke Share Confirmation Modal */}
      {revokingShare && (
        <div className="modal-overlay" onClick={() => setRevokingShare(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ban size={18} color="var(--accent-rose)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Revoke Access Grant</h3>
              </div>
              <button onClick={() => setRevokingShare(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRevokeShare}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                  Are you sure you want to revoke access to <strong>{revokingShare.document_title}</strong> for <strong>{revokingShare.recipient_org_name}</strong>?
                  All future download attempts will be rejected and flagged in the audit trail.
                </p>

                <div className="form-group">
                  <label className="form-label">Revocation Reason (Logged to Audit Trail)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Contract expired, NDA terminated, or confidential data protection directive..."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setRevokingShare(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={processingRevoke} className="btn btn-danger">
                  {processingRevoke ? 'Revoking Access...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Share Modal */}
      {showNewShareModal && (
        <div className="modal-overlay" onClick={() => setShowNewShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Initiate Cross-Org Share</h3>
              </div>
              <button onClick={() => setShowNewShareModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateShareSubmit}>
              <div className="modal-body">
                {shareError && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: '#FB7185', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {shareError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Document to Share</label>
                  <select
                    className="form-select"
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    required
                  >
                    {userDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.classification})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Partner Organization</label>
                  <select
                    className="form-select"
                    value={targetOrgId}
                    onChange={(e) => setTargetOrgId(e.target.value)}
                    required
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.is_verified ? '✓ Verified' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Specific Recipient Email (Optional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. scientist@nexus.org"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Leave blank to grant access to the entire partner organization.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Permission Level</label>
                  <select
                    className="form-select"
                    value={permission}
                    onChange={(e) => setPermission(e.target.value)}
                  >
                    <option value="DOWNLOAD_DOCUMENT">Download & Decrypt Document</option>
                    <option value="VIEW_METADATA">View Metadata Only</option>
                    <option value="UPLOAD_VERSION">Upload New Revision</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <input
                    type="checkbox"
                    id="require-approval-check-2"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="require-approval-check-2" style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Require Security Officer or Manager sign-off before activating this cross-org share
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowNewShareModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={sharing} className="btn btn-primary">
                  {sharing ? 'Creating Grant...' : 'Authorize Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
