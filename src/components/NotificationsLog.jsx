'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RotateCw,
  Search,
  Filter,
  X,
  Clock,
  ShieldAlert,
  Sparkles,
  Layers
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import client from '@/api/client';

export default function NotificationsLog() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ALERT' | 'INFO'
  const router = useRouter();

  const fetchNotifications = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await client.get('/notifications');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        console.error('Error fetching notifications:', err);
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await client.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      Swal.fire({
        title: 'All Caught Up!',
        text: 'All system notifications marked as read.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      await client.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Derived Metrics (Real Data Only — Zero Hardware Telemetry)
  const metrics = useMemo(() => {
    const total = notifications.length;
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const alertsCount = notifications.filter(n => n.type === 'ERROR' || n.type === 'WARNING').length;
    const systemEventsCount = notifications.filter(n => n.type === 'SUCCESS' || n.type === 'INFO').length;

    return {
      total,
      unreadCount,
      alertsCount,
      systemEventsCount
    };
  }, [notifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!notif.message?.toLowerCase().includes(q)) return false;
      }

      // Filter Type
      if (typeFilter === 'UNREAD' && notif.isRead) return false;
      if (typeFilter === 'ALERT' && notif.type !== 'ERROR' && notif.type !== 'WARNING') return false;
      if (typeFilter === 'INFO' && notif.type !== 'SUCCESS' && notif.type !== 'INFO') return false;

      return true;
    });
  }, [notifications, searchQuery, typeFilter]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'SUCCESS':
        return {
          icon: <CheckCircle2 size={18} color="#10B981" />,
          bg: '#DCFCE7',
          color: '#15803D',
          label: 'Success'
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle size={18} color="#D97706" />,
          bg: '#FEF3C7',
          color: '#B45309',
          label: 'Warning'
        };
      case 'ERROR':
        return {
          icon: <XCircle size={18} color="#DC2626" />,
          bg: '#FEE2E2',
          color: '#DC2626',
          label: 'Alert'
        };
      default:
        return {
          icon: <Info size={18} color="#2563EB" />,
          bg: '#DBEAFE',
          color: '#1D4ED8',
          label: 'Information'
        };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading System Notifications...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Operational Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HQ DISPATCH MATRIX • SYSTEM EVENT BROADCASTS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Notifications</h1>
            {metrics.unreadCount > 0 ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: '#FEE2E2',
                color: '#DC2626',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }}></span>
                {metrics.unreadCount} Unread
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: '#DCFCE7',
                color: '#15803D',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                All Caught Up
              </span>
            )}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#F1F5F9',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {metrics.total} Total Events
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Real-time operational alerts, screen heartbeat status changes, and campaign dispatch logs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Reload Notifications"
            style={{
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.88rem',
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {metrics.unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '0.55rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                fontWeight: 600
              }}
            >
              <Check size={16} />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Telemetry Cards (Real Data Only — Zero Hardware Telemetry) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Total Notifications */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Logs
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <Bell size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.total}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: metrics.unreadCount > 0 ? '#DC2626' : '#15803D', fontWeight: 600 }}>
              {metrics.unreadCount} Unread
            </span>
            <span>•</span>
            <span>{metrics.total - metrics.unreadCount} Read</span>
          </div>
        </div>

        {/* Card 2: Unread Alerts */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Unread Action Items
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: metrics.unreadCount > 0 ? '#FEE2E2' : '#ECFDF5', color: metrics.unreadCount > 0 ? '#DC2626' : '#059669' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: metrics.unreadCount > 0 ? '#DC2626' : '#059669', lineHeight: 1.1 }}>
            {metrics.unreadCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {metrics.unreadCount > 0 ? 'Pending operator review' : 'Zero outstanding alerts'}
          </div>
        </div>

        {/* Card 3: Warnings & Alerts */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Warnings &amp; Alerts
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <ShieldAlert size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.alertsCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Screen disconnects &amp; telemetry warnings
          </div>
        </div>

        {/* Card 4: System Events */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              System Confirmations
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <Sparkles size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.systemEventsCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Successful pairings &amp; campaign launches
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Controls Ribbon */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.88rem', height: '38px', paddingBlock: 0 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setTypeFilter('ALL')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: typeFilter === 'ALL' ? '#ffffff' : 'transparent',
                color: typeFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: typeFilter === 'ALL' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: typeFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              All Events ({notifications.length})
            </button>
            <button
              onClick={() => setTypeFilter('UNREAD')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: typeFilter === 'UNREAD' ? '#ffffff' : 'transparent',
                color: typeFilter === 'UNREAD' ? '#DC2626' : 'var(--text-secondary)',
                fontWeight: typeFilter === 'UNREAD' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: typeFilter === 'UNREAD' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              Unread ({metrics.unreadCount})
            </button>
            <button
              onClick={() => setTypeFilter('ALERT')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: typeFilter === 'ALERT' ? '#ffffff' : 'transparent',
                color: typeFilter === 'ALERT' ? '#D97706' : 'var(--text-secondary)',
                fontWeight: typeFilter === 'ALERT' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: typeFilter === 'ALERT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              Alerts ({metrics.alertsCount})
            </button>
            <button
              onClick={() => setTypeFilter('INFO')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: typeFilter === 'INFO' ? '#ffffff' : 'transparent',
                color: typeFilter === 'INFO' ? '#2563EB' : 'var(--text-secondary)',
                fontWeight: typeFilter === 'INFO' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: typeFilter === 'INFO' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              System Events ({metrics.systemEventsCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Notification Items Feed */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <Bell size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Notifications Found
            </h3>
            <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>
              {searchQuery
                ? `No notifications matching "${searchQuery}".`
                : 'All system notifications are clear.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotifications.map((notif, index) => {
              const badge = getTypeBadge(notif.type);
              const formattedDate = notif.createdAt ? new Date(notif.createdAt).toLocaleString() : '';

              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.15rem 1.5rem',
                    borderBottom: index < filteredNotifications.length - 1 ? '1px solid #F1F5F9' : 'none',
                    background: notif.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.03)',
                    cursor: !notif.isRead ? 'pointer' : 'default',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Type Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: badge.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {badge.icon}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: badge.bg,
                          color: badge.color
                        }}>
                          {badge.label}
                        </span>
                        {notif.screenId && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: '#F1F5F9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            Screen #{notif.screenId}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {formattedDate}
                      </span>
                    </div>

                    <p style={{
                      color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: notif.isRead ? 400 : 500,
                      margin: 0,
                      fontSize: '0.92rem',
                      lineHeight: 1.45
                    }}>
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator / Mark Read button */}
                  {!notif.isRead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)', flexShrink: 0 }}></span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-color)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0.2rem 0.4rem'
                        }}
                      >
                        Mark read
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Read</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
