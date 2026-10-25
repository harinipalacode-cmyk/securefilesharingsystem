import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, ShieldAlert, FileText, CheckCircle2, Clock, X } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function NotificationDropdown({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { fetchUnreadCount } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      fetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      fetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '0.75rem',
      width: '380px',
      maxHeight: '480px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 100,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '0.9rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={16} color="var(--accent-emerald)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={handleMarkAllRead}
            title="Mark all as read"
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            <CheckCheck size={14} /> Mark all
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Loading updates...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No notifications right now
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && handleMarkRead(notif.id, { stopPropagation: () => {} })}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.35rem',
                background: notif.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.06)',
                border: notif.is_read ? '1px solid transparent' : '1px solid rgba(16, 185, 129, 0.2)',
                cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <div style={{ marginTop: '0.2rem' }}>
                {notif.notification_type === 'SECURITY_ALERT' ? (
                  <ShieldAlert size={16} color="var(--accent-rose)" />
                ) : notif.notification_type === 'APPROVAL_REQUIRED' ? (
                  <Clock size={16} color="var(--accent-amber)" />
                ) : (
                  <FileText size={16} color="var(--accent-emerald)" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: notif.is_read ? 'var(--text-muted)' : 'var(--text-main)' }}>
                    {notif.title}
                  </span>
                  {!notif.is_read && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                  {notif.message}
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
