import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Key, 
  FileWarning, 
  UserX, 
  X,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SecurityCenter() {
  const { user, activeOrg, userRole } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' | 'RESOLVED'
  const [severityFilter, setSeverityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Resolve Alert Modal
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, [statusFilter, severityFilter, activeOrg]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const [alertsData, metricsData] = await Promise.all([
        api.getSecurityAlerts(params),
        api.getSecurityMetrics()
      ]);
      setAlerts(alertsData);
      setMetrics(metricsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setResolving(true);

    try {
      await api.resolveSecurityAlert(selectedAlert.id, resolutionNotes);
      setSelectedAlert(null);
      setResolutionNotes('');
      loadSecurityData();
    } catch (err) {
      alert(`Failed to resolve alert: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="badge badge-danger"><span className="pulse-dot rose"></span> Critical</span>;
      case 'HIGH':
        return <span className="badge badge-danger">High</span>;
      case 'MEDIUM':
        return <span className="badge badge-warning">Medium</span>;
      default:
        return <span className="badge badge-neutral">Low</span>;
    }
  };

  const canResolve = ['ADMIN', 'SECURITY_OFFICER'].includes(userRole);

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Security Operations Center (SOC)
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time threat monitoring, cryptographic tamper detection, and incident response.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-success" style={{ padding: '0.4rem 0.85rem' }}>
            <span className="pulse-dot emerald"></span> Cryptographic Monitor Active
          </span>
        </div>
      </div>

      {/* Threat Posture Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Alerts</span>
            <ShieldAlert size={16} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: metrics.active_alerts_count > 0 ? 'var(--accent-rose)' : 'var(--text-main)' }}>
            {metrics.active_alerts_count || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Requires investigation
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Critical Violations</span>
            <FileWarning size={16} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: metrics.critical_alerts_count > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {metrics.critical_alerts_count || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Integrity breaches
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unauthorized Probes</span>
            <UserX size={16} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {metrics.failed_access_attempts_24h || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Denied past 24 hours
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compliance Mode</span>
            <ShieldCheck size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.4rem' }}>
            SOC2 / FIPS-Ready
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            AES-GCM Envelope Encryption
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div className="tabs-nav" style={{ marginBottom: 0 }}>
          <button
            className={`tab-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            <AlertTriangle size={16} /> Active Alerts
          </button>
          <button
            className={`tab-btn ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('RESOLVED')}
          >
            <CheckCircle2 size={16} /> Resolved Alerts
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--text-dim)" />
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Loading security feed...
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <ShieldCheck size={40} color="var(--accent-emerald)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>All Systems Clear</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              No {statusFilter.toLowerCase()} security alerts detected for {activeOrg?.name}.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Incident Title</th>
                  <th>Category</th>
                  <th>Detection Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{getSeverityBadge(alert.severity)}</td>

                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '480px' }}>
                        {alert.description}
                      </div>
                      {alert.resolution_notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
                          Resolved: {alert.resolution_notes} ({alert.resolved_by_name || alert.resolved_by_email})
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {alert.alert_type_display || alert.alert_type}
                      </span>
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {new Date(alert.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td>
                      <span className={`badge ${alert.status === 'ACTIVE' ? 'badge-danger' : 'badge-success'}`}>
                        {alert.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {alert.status === 'ACTIVE' && canResolve && (
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="btn btn-outline btn-sm"
                        >
                          <CheckCircle2 size={13} color="var(--accent-emerald)" /> Investigate & Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Incident Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Resolve Security Alert</h3>
              </div>
              <button onClick={() => setSelectedAlert(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit}>
              <div className="modal-body">
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.25)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    {getSeverityBadge(selectedAlert.severity)}
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{selectedAlert.title}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    {selectedAlert.description}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Investigation Findings & Resolution Actions</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Document root cause analysis, mitigation applied, or verification details..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedAlert(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={resolving} className="btn btn-primary">
                  {resolving ? 'Recording Resolution...' : 'Mark Alert Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
