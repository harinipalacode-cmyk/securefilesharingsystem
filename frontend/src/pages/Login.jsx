import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Building2, User, KeyRound } from 'lucide-react';
import { useAuth, TEST_USERS } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          username,
          email: emailOrUser,
          password,
          full_name: fullName,
          organization_name: orgName
        });
      } else {
        await login(emailOrUser, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user) => {
    setError('');
    setLoading(true);
    try {
      await login(user.email, user.password);
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #172554 0%, #0B0F19 65%)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '980px', display: 'flex', gap: '2rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
        
        {/* Left Side: Login Form Card */}
        <div className="glass-panel" style={{
          flex: '1 1 420px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
              }}>
                <ShieldCheck size={24} color="var(--accent-emerald)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>SecureShare</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>Cross-Organization Cryptographic Exchange</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.75rem' }}>
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: !isRegister ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                  padding: '0.5rem 0.25rem',
                  color: !isRegister ? 'var(--accent-emerald)' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isRegister ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                  padding: '0.5rem 0.25rem',
                  color: isRegister ? 'var(--accent-emerald)' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Register Organization
              </button>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#FB7185',
                fontSize: '0.825rem',
                marginBottom: '1.25rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <>
                  <div className="form-group">
                    <label className="form-label">Desired Username</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. john.doe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organization Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sovereign Research Institute"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">{isRegister ? 'Official Work Email' : 'Email or Username'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={isRegister ? 'email' : 'text'}
                    className="form-input"
                    placeholder="user@organization.gov"
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {loading ? 'Authenticating...' : (isRegister ? 'Create Account & Vault' : 'Secure Authenticate')}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Encrypted with hardware-backed AES-256-GCM envelope keys.
          </div>
        </div>

        {/* Right Side: Instant Demo Switcher */}
        <div className="glass-panel" style={{
          flex: '1 1 360px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <KeyRound size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Evaluation Demo Profiles</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click any verified identity below to instantly sign in and explore cross-organization sharing and security controls:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {TEST_USERS.map((u) => (
              <div
                key={u.email}
                onClick={() => handleQuickLogin(u)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-emerald)';
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'var(--bg-card)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</span>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      {u.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{u.org}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{u.email} &bull; {u.role}</div>
                </div>
                <ArrowRight size={16} color="var(--accent-emerald)" />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
          }}>
            Default seed password for all demo accounts: <code className="font-mono" style={{ color: 'var(--accent-emerald)' }}>SecureShare123!</code>
          </div>
        </div>

      </div>
    </div>
  );
}
