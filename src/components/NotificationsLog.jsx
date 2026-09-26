'use client';
import { useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import client from '@/api/client';

export default function NotificationsLog() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await client.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [router]);

  const markAllAsRead = async () => {
    try {
      await client.put('/notifications/read-all');
      fetchNotifications();
      Swal.fire({ title: 'Success', text: 'All notifications marked as read', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle size={20} color="#10B981" />;
      case 'WARNING': return <AlertTriangle size={20} color="#F59E0B" />;
      case 'ERROR': return <XCircle size={20} color="#EF4444" />;
      default: return <Info size={20} color="#3B82F6" />;
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading notifications...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">View and manage all system alerts and updates</p>
        </div>
        <button className="btn-secondary" onClick={markAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} /> Mark all as read
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Bell size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p>You have no notifications at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((notif, index) => (
              <div 
                key={notif.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '1rem', 
                  padding: '1.25rem 1.5rem',
                  borderBottom: index < notifications.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  background: notif.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.03)',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ marginTop: '0.25rem' }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: notif.isRead ? 500 : 600, color: 'var(--text-primary)' }}>
                      {notif.type === 'SUCCESS' ? 'Success' : notif.type === 'WARNING' ? 'Warning' : notif.type === 'ERROR' ? 'Error' : 'Information'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                    {notif.message}
                  </p>
                </div>
                {!notif.isRead && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', alignSelf: 'center' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
