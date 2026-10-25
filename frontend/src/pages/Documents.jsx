import React, { useState, useEffect } from 'react';
import { 
  FolderLock, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Share2, 
  FileText, 
  History, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Lock,
  Layers
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Documents() {
  const { user, activeOrg } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadClassification, setUploadClassification] = useState('INTERNAL');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Version History Modal State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [newVersionSummary, setNewVersionSummary] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Integrity Check Result State
  const [integrityResult, setIntegrityResult] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  // Cross-Org Share Quick Modal State
  const [shareDoc, setShareDoc] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('DOWNLOAD_DOCUMENT');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    loadDocuments();
    loadOrganizations();
  }, [classification, search, activeOrg]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (classification) params.classification = classification;
      if (search) params.search = search;
      const data = await api.getDocuments(params);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const orgs = await api.getOrganizations();
      setOrganizations(orgs.filter(o => o.id !== activeOrg?.id));
    } catch (e) {
      console.error(e);
    }
  };

  // Upload Encrypted Document
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to encrypt and store.');
      return;
    }
    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle || uploadFile.name);
      formData.append('description', uploadDesc);
      formData.append('classification', uploadClassification);

      await api.uploadDocument(formData);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
      loadDocuments();
    } catch (err) {
      setUploadError(err.message || 'Failed to encrypt and upload document.');
    } finally {
      setUploading(false);
    }
  };

  // Download and Decrypt File
  const handleDownload = async (docId, versionId = null) => {
    try {
      const { blob, filename, sha256 } = await api.downloadDocument(docId, versionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(`Download/Decryption failed: ${err.message}`);
    }
  };

  // Verify Cryptographic Integrity
  const handleVerifyIntegrity = async (docId) => {
    setVerifyingId(docId);
    setIntegrityResult(null);
    try {
      const res = await api.verifyIntegrity(docId);
      setIntegrityResult({ docId, ...res });
    } catch (err) {
      setIntegrityResult({ docId, status: 'INTEGRITY_VIOLATION', error: err.message });
    } finally {
      setVerifyingId(null);
    }
  };

  // Upload New Version
  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!newVersionFile || !selectedDoc) return;
    setUploadingVersion(true);

    try {
      const formData = new FormData();
      formData.append('file', newVersionFile);
      formData.append('change_summary', newVersionSummary);

      await api.uploadNewVersion(selectedDoc.id, formData);
      const updated = await api.getDocument(selectedDoc.id);
      setSelectedDoc(updated);
      setNewVersionFile(null);
      setNewVersionSummary('');
      loadDocuments();
    } catch (err) {
      alert(`Version upload failed: ${err.message}`);
    } finally {
      setUploadingVersion(false);
    }
  };

  // Create Share from Quick Modal
  const handleCreateShare = async (e) => {
    e.preventDefault();
    if (!shareDoc || !targetOrgId) return;
    setSharing(true);
    setShareMessage('');

    try {
      await api.createShare({
        document_id: shareDoc.id,
        recipient_organization_id: targetOrgId,
        recipient_email: recipientEmail,
        permission: sharePermission,
        requires_approval: requiresApproval,
      });
      setShareMessage('Document share created successfully!');
      setTimeout(() => {
        setShareDoc(null);
        setShareMessage('');
      }, 1500);
    } catch (err) {
      alert(`Share failed: ${err.message}`);
    } finally {
      setSharing(false);
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Encrypted Document Vault
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Envelope-encrypted documents protected by unique 256-bit AES-GCM data encryption keys.
          </p>
        </div>

        <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
          <Upload size={16} /> Upload & Encrypt
        </button>
      </div>

      {/* Integrity banner if result */}
      {integrityResult && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.5rem',
          background: integrityResult.status === 'INTEGRITY_VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: integrityResult.status === 'INTEGRITY_VERIFIED' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {integrityResult.status === 'INTEGRITY_VERIFIED' ? (
              <ShieldCheck size={22} color="var(--accent-emerald)" />
            ) : (
              <AlertCircle size={22} color="var(--accent-rose)" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFF' }}>
                {integrityResult.status === 'INTEGRITY_VERIFIED' ? 'Cryptographic Integrity Confirmed' : 'Integrity Violation Detected'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {integrityResult.message || integrityResult.error}
                {integrityResult.sha256 && ` • SHA-256: ${integrityResult.sha256.substring(0, 16)}...`}
              </div>
            </div>
          </div>
          <button onClick={() => setIntegrityResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search documents by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-dim)" />
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          >
            <option value="">All Classifications</option>
            <option value="PUBLIC">Public</option>
            <option value="INTERNAL">Internal</option>
            <option value="CONFIDENTIAL">Confidential</option>
            <option value="HIGHLY_CONFIDENTIAL">Highly Confidential</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Loading encrypted vault...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <FolderLock size={40} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No documents found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
              Upload your first encrypted file to begin cross-organization collaboration.
            </p>
            <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
              <Upload size={16} /> Upload & Encrypt
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Classification</th>
                  <th>Version</th>
                  <th>Encryption / Hash</th>
                  <th>Owner / Org</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const latest = doc.latest_version;
                  const isVerifying = verifyingId === doc.id;
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            <FileText size={18} color="var(--accent-emerald)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {doc.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {latest?.file_name} &bull; {(latest?.file_size ? (latest.file_size / 1024).toFixed(1) : 0)} KB
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>{getClassificationBadge(doc.classification)}</td>

                      <td>
                        <button
                          onClick={() => { setSelectedDoc(doc); setShowVersionModal(true); }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        >
                          <Layers size={13} /> v{latest?.version_number || 1} ({doc.versions_count || 1})
                        </button>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                          AES-256-GCM
                        </div>
                        <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                          {latest?.sha256_hash ? `${latest.sha256_hash.substring(0, 14)}...` : 'N/A'}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>{doc.owner_name || doc.owner_email}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{doc.organization_name}</div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {/* Integrity Check Button */}
                          <button
                            onClick={() => handleVerifyIntegrity(doc.id)}
                            disabled={isVerifying}
                            className="btn btn-outline btn-sm"
                            title="Verify AES-GCM tag and SHA-256 Checksum"
                          >
                            <ShieldCheck size={14} color="var(--accent-emerald)" />
                            {isVerifying ? 'Checking...' : 'Verify'}
                          </button>

                          {/* Download & Decrypt Button */}
                          <button
                            onClick={() => handleDownload(doc.id)}
                            className="btn btn-primary btn-sm"
                            title="Decrypt with DEK and Download File"
                          >
                            <Download size={14} /> Decrypt
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => { setShareDoc(doc); setTargetOrgId(organizations[0]?.id || ''); }}
                            className="btn btn-secondary btn-sm"
                            title="Share with another organization"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Upload & Encrypt */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderLock size={20} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Upload & Encrypt File</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                {uploadError && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: '#FB7185', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {uploadError}
                  </div>
                )}

                {/* File Dropzone */}
                <div className="form-group">
                  <label className="form-label">Select Document to Encrypt</label>
                  <div style={{
                    border: '2px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.2)',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('file-upload-input').click()}
                  >
                    <Upload size={32} color="var(--accent-emerald)" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {uploadFile ? uploadFile.name : 'Click to browse or drag file here'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                      {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : 'All formats supported. Encrypted with AES-256-GCM before writing to storage.'}
                    </div>
                    <input
                      id="file-upload-input"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                          if (!uploadTitle) setUploadTitle(e.target.files[0].name);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Document Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Avionics Guidance Firmware Specs"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Classification Level</label>
                  <select
                    className="form-select"
                    value={uploadClassification}
                    onChange={(e) => setUploadClassification(e.target.value)}
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="INTERNAL">Internal</option>
                    <option value="CONFIDENTIAL">Confidential</option>
                    <option value="HIGHLY_CONFIDENTIAL">Highly Confidential</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Provide operational context or handling notes..."
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                  />
                </div>

                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <ShieldCheck size={16} />
                  <span>Envelope encryption will generate a unique 256-bit DEK, wrap with Master KEK, and calculate SHA-256 integrity digest.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn btn-primary">
                  {uploading ? 'Encrypting & Vaulting...' : 'Encrypt & Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Version Timeline & Upload Version */}
      {showVersionModal && selectedDoc && (
        <div className="modal-overlay" onClick={() => setShowVersionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Version History</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>{selectedDoc.title}</p>
              </div>
              <button onClick={() => setShowVersionModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Existing Versions Timeline */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Recorded Versions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDoc.versions?.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '0.85rem 1rem',
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                            v{v.version_number}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {v.file_name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          SHA-256: <code className="font-mono">{v.sha256_hash?.substring(0, 18)}...</code>
                        </div>
                        {v.change_summary && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            "{v.change_summary}"
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDownload(selectedDoc.id, v.id)}
                        className="btn btn-outline btn-sm"
                        title="Download this specific version"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload New Version Section */}
              <form onSubmit={handleUploadVersion} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  Upload New Version
                </div>
                <div className="form-group">
                  <input
                    type="file"
                    className="form-input"
                    onChange={(e) => setNewVersionFile(e.target.files[0])}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Change summary / revision notes (optional)"
                    value={newVersionSummary}
                    onChange={(e) => setNewVersionSummary(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadingVersion || !newVersionFile}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  {uploadingVersion ? 'Encrypting Version...' : 'Commit New Encrypted Version'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Share Modal */}
      {shareDoc && (
        <div className="modal-overlay" onClick={() => setShareDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={18} color="var(--accent-purple)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Share Document Across Organizations</h3>
              </div>
              <button onClick={() => setShareDoc(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateShare}>
              <div className="modal-body">
                {shareMessage && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {shareMessage}
                  </div>
                )}

                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Document to Share</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{shareDoc.title}</div>
                  <div style={{ marginTop: '0.25rem' }}>{getClassificationBadge(shareDoc.classification)}</div>
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
                  <label className="form-label">Recipient User Email (Optional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. researcher@partner.org"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Leave blank to grant access to the entire partner organization.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Permission Level</label>
                  <select
                    className="form-select"
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value)}
                  >
                    <option value="DOWNLOAD_DOCUMENT">Download & Decrypt Document</option>
                    <option value="VIEW_METADATA">View Metadata Only</option>
                    <option value="UPLOAD_VERSION">Upload New Revision</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <input
                    type="checkbox"
                    id="require-approval-check"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="require-approval-check" style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Require Security Officer or Manager sign-off before activating this cross-org share
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShareDoc(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={sharing} className="btn btn-primary">
                  {sharing ? 'Creating Grant...' : 'Authorize Share Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
