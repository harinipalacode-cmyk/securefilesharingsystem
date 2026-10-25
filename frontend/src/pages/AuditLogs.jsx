import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  User,
  Globe,
  Eye,
  X
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AuditLogs() {
  const { user, activeOrg, userRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [outcome, setOutcome] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAuditLogs();
  }, [eventType, outcome, search, activeOrg]);

  const loadAuditLogs = async () => {
    setLoading(true);

    try {
      const params = {};

      if (eventType) params.event_type = eventType;
      if (outcome) params.outcome = outcome;
      if (search) params.search = search;

      const data = await api.getAuditLogs(params);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const { blob, filename } = await api.exportAuditLogs();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        filename || `secureshare-audit-${activeOrg?.slug || 'export'}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      alert(
        error.message ||
          'Unable to export audit logs. Please try again.'
      );
    }
  };

  const canExport = ['ADMIN', 'SECURITY_OFFICER'].includes(userRole);

  return (
    <div className="page-body">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              marginBottom: '0.25rem'
            }}
          >
            Immutable Audit Trail
          </h1>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}
          >
            Tamper-evident chronological ledger of all authentication,
            encryption, download, and sharing actions.
          </p>
        </div>

        {canExport && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
          >
            <Download size={16} /> Export SOC2 CSV
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: '220px',
            position: 'relative'
          }}
        >
          <Search
            size={16}
            color="var(--text-dim)"
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />

          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by actor email, document title, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Filter size={15} color="var(--text-dim)" />

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="">All Event Categories</option>
            <option value="DOC_UPLOAD">Document Uploaded</option>
            <option value="DOC_DOWNLOAD">
              Document Decrypted &amp; Downloaded
            </option>
            <option value="DOC_INTEGRITY_CHECK">
              Integrity Verified
            </option>
            <option value="SHARE_EXTERNAL_CREATE">
              Cross-Org Share Created
            </option>
            <option value="SHARE_REVOKE">Share Revoked</option>
            <option value="UNAUTHORIZED_ACCESS_ATTEMPT">
              Unauthorized Access Attempt
            </option>
            <option value="INTEGRITY_FAILURE">
              Integrity Violation
            </option>
            <option value="AUTH_LOGIN_SUCCESS">
              Login Successful
            </option>
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied Only</option>
            <option value="FAILED">Failed Only</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div
            style={{
              padding: '4rem',
              textAlign: 'center',
              color: 'var(--text-dim)'
            }}
          >
            Retrieving immutable ledger...
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              padding: '4rem 1rem',
              textAlign: 'center'
            }}
          >
            <History
              size={36}
              color="var(--text-dim)"
              style={{ marginBottom: '1rem' }}
            />

            <h3
              style={{
                fontSize: '1.1rem',
                marginBottom: '0.5rem'
              }}
            >
              No audit records match query
            </h3>

            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-dim)'
              }}
            >
              All transactions are automatically appended to this ledger
              when actions execute.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Action / Event</th>
                  <th>Actor</th>
                  <th>Resource Target</th>
                  <th>IP Address</th>
                  <th>Outcome</th>
                  <th style={{ textAlign: 'right' }}>Details</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td
                      style={{
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-dim)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {new Date(log.timestamp)
                        .toISOString()
                        .replace('T', ' ')
                        .substring(0, 19)}
                    </td>

                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: 'var(--text-main)'
                        }}
                      >
                        {log.event_type_display || log.event_type}
                      </div>

                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {log.event_type}
                      </div>
                    </td>

                    <td>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--text-main)'
                        }}
                      >
                        {log.actor_name ||
                          log.actor_email ||
                          'System Daemon'}
                      </div>
                    </td>

                    <td>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 500,
                          color: 'var(--text-muted)'
                        }}
                      >
                        {log.resource_name || log.resource_type}
                      </div>

                      {log.resource_id && (
                        <div
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-dim)',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          ID: {String(log.resource_id).substring(0, 12)}...
                        </div>
                      )}
                    </td>

                    <td
                      style={{
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-dim)'
                      }}
                    >
                      {log.ip_address || 'Internal'}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          log.outcome === 'SUCCESS'
                            ? 'badge-success'
                            : log.outcome === 'DENIED'
                              ? 'badge-warning'
                              : 'badge-danger'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {log.outcome}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn btn-outline btn-sm"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Inspector Modal */}
      {selectedLog && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <History
                  size={18}
                  color="var(--accent-cyan)"
                />

                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700
                  }}
                >
                  Audit Event Inspector
                </h3>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase'
                    }}
                  >
                    Event Type
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--text-main)'
                    }}
                  >
                    {selectedLog.event_type}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase'
                    }}
                  >
                    Outcome
                  </div>

                  <span
                    className={`badge ${
                      selectedLog.outcome === 'SUCCESS'
                        ? 'badge-success'
                        : 'badge-danger'
                    }`}
                  >
                    {selectedLog.outcome}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase'
                    }}
                  >
                    Timestamp
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {selectedLog.timestamp}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase'
                    }}
                  >
                    Actor Identity
                  </div>

                  <div style={{ fontSize: '0.85rem' }}>
                    {selectedLog.actor_email || 'System'}
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase'
                  }}
                >
                  Raw Event Context Payload
                </div>

                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--accent-emerald)',
                    overflowX: 'auto'
                  }}
                >
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}