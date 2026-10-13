'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tv,
  Search,
  Download,
  Film,
  RotateCw,
  Layers,
  Users,
  X,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import client from '@/api/client';

export default function MasterProofOfPlay() {
  const [logs, setLogs] = useState([]);
  const [screens, setScreens] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreenFilter, setSelectedScreenFilter] = useState('ALL');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [logRes, screenRes, adminRes] = await Promise.allSettled([
        client.get('/master/proof-of-play'),
        client.get('/master/screens'),
        client.get('/master/admins')
      ]);

      if (logRes.status === 'fulfilled' && Array.isArray(logRes.value?.data)) {
        setLogs(logRes.value.data);
      }
      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (adminRes.status === 'fulfilled' && Array.isArray(adminRes.value?.data)) {
        setAdmins(adminRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching master proof of play:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Distinct screens from logs and fleet
  const distinctScreens = useMemo(() => {
    const fromLogs = logs.map(l => l.screenName).filter(Boolean);
    const fromFleet = screens.map(s => s.name).filter(Boolean);
    return Array.from(new Set([...fromLogs, ...fromFleet]));
  }, [logs, screens]);

  // Distinct admins from logs and directory
  const distinctAdmins = useMemo(() => {
    const fromLogs = logs.map(l => l.adminEmail).filter(Boolean);
    const fromDirectory = admins.map(a => a.email).filter(Boolean);
    return Array.from(new Set([...fromLogs, ...fromDirectory]));
  }, [logs, admins]);

  // Dynamic Telemetry Metrics (Real Data Only — Zero Hardware Telemetry)
  const metrics = useMemo(() => {
    const total = logs.length;
    const completed = logs.filter(l => l.status === 'COMPLETED').length;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '100.0';

    // Unique screens logging playback
    const uniqueLoggedScreens = new Set(logs.map(l => l.screenName).filter(Boolean));

    // Unique admins with logged playback
    const uniqueLoggedAdmins = new Set(logs.map(l => l.adminEmail).filter(Boolean));

    // Total airtime duration in seconds and hours
    const totalDurationSeconds = logs.reduce((acc, l) => acc + (Number(l.duration) || 0), 0);
    const totalHours = (totalDurationSeconds / 3600).toFixed(1);
    const totalMinutes = Math.round(totalDurationSeconds / 60);

    return {
      total,
      completed,
      successRate,
      uniqueLoggedScreensCount: uniqueLoggedScreens.size,
      uniqueLoggedAdminsCount: uniqueLoggedAdmins.size,
      totalHours,
      totalMinutes
    };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesScreen = log.screenName?.toLowerCase().includes(q);
        const matchesCampaign = log.campaignName?.toLowerCase().includes(q);
        const matchesMedia = log.mediaName?.toLowerCase().includes(q);
        const matchesAdmin = log.adminEmail?.toLowerCase().includes(q);
        if (!matchesScreen && !matchesCampaign && !matchesMedia && !matchesAdmin) return false;
      }

      // Screen filter
      if (selectedScreenFilter !== 'ALL' && log.screenName !== selectedScreenFilter) {
        return false;
      }

      // Admin filter
      if (selectedAdminFilter !== 'ALL' && log.adminEmail !== selectedAdminFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'COMPLETED' && log.status !== 'COMPLETED') return false;
        if (selectedStatusFilter === 'FAILED' && log.status === 'COMPLETED') return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedScreenFilter, selectedAdminFilter, selectedStatusFilter]);

  // Tenant Admin Delivery Summary
  const adminDeliveryStats = useMemo(() => {
    return distinctAdmins.map(adminEmail => {
      const adminLogs = logs.filter(l => l.adminEmail === adminEmail);
      const totalAirtime = adminLogs.reduce((acc, l) => acc + (Number(l.duration) || 0), 0);
      return {
        email: adminEmail,
        playCount: adminLogs.length,
        airtimeSeconds: totalAirtime
      };
    }).sort((a, b) => b.playCount - a.playCount);
  }, [distinctAdmins, logs]);

  // Export Full Audit CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Screen', 'Tenant Admin', 'Campaign', 'Media Asset', 'Media Type', 'Duration (seconds)', 'Status'];
    const rows = filteredLogs.map(log => [
      `"${log.playedAt ? new Date(log.playedAt).toISOString() : new Date().toISOString()}"`,
      `"${log.screenName || 'Unknown Screen'}"`,
      `"${log.adminEmail || 'Unassigned'}"`,
      `"${log.campaignName || 'Unknown Campaign'}"`,
      `"${log.mediaName || 'Media Clip'}"`,
      `"${log.mediaType || 'VIDEO'}"`,
      log.duration || 0,
      `"${log.status || 'COMPLETED'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `master_proof_of_play_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Network Playback Audit Ledger...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Operational Matrix Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              NETWORK AUDIT LEDGER • GLOBAL PROOF OF PLAY
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Proof of Play Analytics</h1>
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
              {metrics.total} Verified Receipts
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#DBEAFE',
              color: '#1D4ED8',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {metrics.successRate}% Delivery SLA
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Global cryptographic playback receipts recorded across all regional tenant screens and broadcast campaigns.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Reload Network Telemetry"
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

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '0.55rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              opacity: logs.length === 0 ? 0.6 : 1,
              cursor: logs.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={16} />
            <span>Export Audit (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Telemetry Cards (Real Data Only — Zero Hardware Telemetry) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Verified Events */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Verified Events
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.total}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>{metrics.completed} Completed</span>
            <span>•</span>
            <span>{metrics.total - metrics.completed} In-flight</span>
          </div>
        </div>

        {/* Card 2: Delivery SLA Rate */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Airtime Delivery SLA
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
            {metrics.successRate}%
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Hardware execution confirmation rate
          </div>
        </div>

        {/* Card 3: Displays Logged */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Displays Logged
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <Tv size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.uniqueLoggedScreensCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Unique physical screens transmitting logs
          </div>
        </div>

        {/* Card 4: Total Airtime */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Airtime Logged
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalHours > 0 ? `${metrics.totalHours}h` : `${metrics.totalMinutes}m`}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Across <strong style={{ color: 'var(--text-primary)' }}>{metrics.uniqueLoggedAdminsCount}</strong> tenant accounts
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Controls Ribbon */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search screen, campaign, media, admin..."
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

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Screen Dropdown */}
            {distinctScreens.length > 0 && (
              <select
                value={selectedScreenFilter}
                onChange={(e) => setSelectedScreenFilter(e.target.value)}
                className="input-field"
                style={{ height: '38px', paddingBlock: 0, fontSize: '0.82rem', paddingInline: '0.65rem' }}
              >
                <option value="ALL">All Screens ({distinctScreens.length})</option>
                {distinctScreens.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}

            {/* Admin Dropdown */}
            {distinctAdmins.length > 0 && (
              <select
                value={selectedAdminFilter}
                onChange={(e) => setSelectedAdminFilter(e.target.value)}
                className="input-field"
                style={{ height: '38px', paddingBlock: 0, fontSize: '0.82rem', paddingInline: '0.65rem' }}
              >
                <option value="ALL">All Tenant Admins</option>
                {distinctAdmins.map(email => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => setSelectedStatusFilter('ALL')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedStatusFilter === 'ALL' ? '#ffffff' : 'transparent',
                  color: selectedStatusFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: selectedStatusFilter === 'ALL' ? 600 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                All Receipts ({logs.length})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('COMPLETED')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedStatusFilter === 'COMPLETED' ? '#ffffff' : 'transparent',
                  color: selectedStatusFilter === 'COMPLETED' ? '#15803D' : 'var(--text-secondary)',
                  fontWeight: selectedStatusFilter === 'COMPLETED' ? 600 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Verified
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column (8 cols): Real-Time Proof-of-Play Audit Table */}
        <div style={{ gridColumn: 'span 12', lg: 'span 8', minWidth: 0 }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Playback Verification Ledger ({filteredLogs.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Audited hardware playback events with duration and timestamp verification
                </p>
              </div>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Showing {filteredLogs.length} receipts
              </span>
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
                  No Verification Records Found
                </h4>
                <p style={{ fontSize: '0.85rem', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
                  {searchQuery || selectedScreenFilter !== 'ALL' || selectedAdminFilter !== 'ALL'
                    ? 'No receipts matched your filter parameters. Try clearing your filters.'
                    : 'Physical displays will transmit verified receipts automatically as campaigns play.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Media Asset</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Screen Node</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Tenant Admin</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Campaign</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Airtime</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => {
                      const isCompleted = log.status === 'COMPLETED';
                      const formattedTime = log.playedAt
                        ? new Date(log.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Just now';
                      const formattedDate = log.playedAt
                        ? new Date(log.playedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                        : '';

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          {/* Media Asset Preview */}
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{
                                width: 56,
                                height: 34,
                                borderRadius: '6px',
                                overflow: 'hidden',
                                background: '#0F172A',
                                flexShrink: 0,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {log.mediaUrl ? (
                                  log.mediaType?.startsWith('image') ? (
                                    <img src={log.mediaUrl} alt={log.mediaName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <video src={log.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                  )
                                ) : (
                                  <Film size={16} color="#94A3B8" />
                                )}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={log.mediaName}>
                                  {log.mediaName}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                  {log.mediaType || 'VIDEO'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Screen Node */}
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.screenName}
                            </div>
                          </td>

                          {/* Tenant Admin */}
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {log.adminEmail || 'Unassigned'}
                          </td>

                          {/* Campaign */}
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              color: 'var(--text-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {log.campaignName}
                            </span>
                          </td>

                          {/* Airtime */}
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {log.duration}s
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div>{formattedTime}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{formattedDate}</div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              background: isCompleted ? '#DCFCE7' : '#FEE2E2',
                              color: isCompleted ? '#15803D' : '#DC2626',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isCompleted ? '#16A34A' : '#DC2626' }}></span>
                              {isCompleted ? 'Verified' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Regional Tenant Breakdown & SLA Integrity */}
        <aside style={{ gridColumn: 'span 12', lg: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Tenant Admin Airtime Matrix */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', margin: 0 }}>
                  Tenant Delivery Matrix
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600 }}>Regional Airtime Breakdown</span>
              </div>
              <Link href="/master/admins" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                Admins
              </Link>
            </div>

            {adminDeliveryStats.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>No tenant airtime recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {adminDeliveryStats.slice(0, 6).map(item => (
                  <div
                    key={item.email}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {item.email}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Airtime: {Math.round(item.airtimeSeconds / 60)} mins logged
                      </div>
                    </div>

                    <span style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {item.playCount} plays
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SLA Compliance Summary */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                Audit SLA Compliance
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Delivery SLA Standard:</span>
                <strong style={{ color: '#059669' }}>99.5% Minimum</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Fleet Performance:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{metrics.successRate}% Nominal</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Receipt Encryption:</span>
                <strong style={{ color: 'var(--text-primary)' }}>Cryptographic SHA-256</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Auto-Purge Retention:</span>
                <strong style={{ color: 'var(--text-primary)' }}>90-Day Enterprise SLA</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
