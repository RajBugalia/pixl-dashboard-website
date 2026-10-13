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
  FileText,
  Activity,
  Layers
} from 'lucide-react';
import client from '@/api/client';

export default function AdminProofOfPlay() {
  const [logs, setLogs] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreenFilter, setSelectedScreenFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    try {
      const [logRes, screenRes] = await Promise.allSettled([
        client.get('/admin/proof-of-play'),
        client.get('/admin/screens')
      ]);

      if (logRes.status === 'fulfilled' && Array.isArray(logRes.value?.data)) {
        setLogs(logRes.value.data);
      }
      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching proof of play logs:', err);
    } finally {
      setLoading(false);
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

  // Dynamic Metrics (Real Data Only - NO temp, storage, ram)
  const metrics = useMemo(() => {
    const total = logs.length;
    const completed = logs.filter(l => l.status === 'COMPLETED').length;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '100.0';

    // Unique screens that have logged playback
    const uniqueLoggedScreens = new Set(logs.map(l => l.screenName).filter(Boolean));

    // Total airtime duration in seconds and hours
    const totalDurationSeconds = logs.reduce((acc, l) => acc + (Number(l.duration) || 0), 0);
    const totalHours = (totalDurationSeconds / 3600).toFixed(1);
    const totalMinutes = Math.round(totalDurationSeconds / 60);

    return {
      total,
      completed,
      successRate,
      uniqueLoggedScreensCount: uniqueLoggedScreens.size,
      totalHours,
      totalMinutes
    };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesScreen = log.screenName?.toLowerCase().includes(q);
        const matchesCampaign = log.campaignName?.toLowerCase().includes(q);
        const matchesMedia = log.mediaName?.toLowerCase().includes(q);
        if (!matchesScreen && !matchesCampaign && !matchesMedia) return false;
      }

      // Screen filter
      if (selectedScreenFilter !== 'ALL' && log.screenName !== selectedScreenFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'COMPLETED' && log.status !== 'COMPLETED') return false;
        if (selectedStatusFilter === 'FAILED' && log.status === 'COMPLETED') return false;
      }

      return true;
    });
  }, [logs, searchQuery, selectedScreenFilter, selectedStatusFilter]);

  // Screen Node delivery matrix derived dynamically
  const screenNodeStats = useMemo(() => {
    return screens.map(s => {
      const screenLogs = logs.filter(l => l.screenName === s.name);
      const isOnline = s.status === 'ONLINE' || s.status === 'ACTIVE';
      return {
        id: s.id,
        name: s.name,
        location: s.location || 'Location Not Set',
        isOnline,
        playCount: screenLogs.length
      };
    });
  }, [screens, logs]);

  // Export Full Audit CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Screen', 'Campaign', 'Media Asset', 'Media Type', 'Duration (seconds)', 'Status'];
    const rows = filteredLogs.map(log => [
      `"${log.playedAt ? new Date(log.playedAt).toISOString() : new Date().toISOString()}"`,
      `"${log.screenName || 'Unknown Screen'}"`,
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
    link.setAttribute('download', `proof_of_play_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Analytics &amp; Proof of Play</h1>
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
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }}></span>
              {metrics.total} Verified Receipts
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time audit ledger verifying physical display playback, broadcast durations, and campaign delivery.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '0.5rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            opacity: logs.length === 0 ? 0.6 : 1,
            cursor: logs.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <Download size={16} />
          <span>Export Audit (CSV)</span>
        </button>
      </div>

      {/* 4 High-Impact Metric Cards (Stitch Design, 100% Dynamic) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Total Playback Events */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Film size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Playback Events
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{metrics.total}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Verified plays</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>Ledger</span>
        </div>

        {/* Card 2: Playback Success Rate */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Airtime Delivery
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{metrics.successRate}%</span>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>SLA Met</span>
              </div>
            </div>
          </div>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
        </div>

        {/* Card 3: Displays Logged */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FFFBEB',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tv size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Displays
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706' }}>
                  {metrics.uniqueLoggedScreensCount}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>of {screens.length} fleet</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>Screens</span>
        </div>

        {/* Card 4: Total Broadcast Airtime */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F5F3FF',
              color: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Airtime
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7C3AED' }}>
                  {metrics.totalHours > 0 ? `${metrics.totalHours}h` : `${metrics.totalMinutes}m`}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Screen time</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600 }}>Duration</span>
        </div>
      </div>

      {/* Filter & Search Ribbon */}
      <div className="screens-toolbar">
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by screen, campaign, or media clip..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '34px',
              paddingRight: '12px',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#0F172A',
              outline: 'none'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Screen Dropdown */}
          <select
            value={selectedScreenFilter}
            onChange={e => setSelectedScreenFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#0F172A',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">All Screens ({distinctScreens.length})</option>
            {distinctScreens.map(scr => (
              <option key={scr} value={scr}>{scr}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#0F172A',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Verified (Completed)</option>
            <option value="FAILED">Flagged / Incomplete</option>
          </select>
        </div>
      </div>

      {/* Main Two-Column Layout (Ledger Table + Delivery Side Matrix) */}
      <div className="campaigns-two-col-layout">
        {/* Left Column: Proof-of-Play Audit Table */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748B' }}>
              <p>Loading proof-of-play analytics...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
              <ShieldCheck size={40} style={{ color: '#94A3B8', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {logs.length === 0 ? 'No playback logs recorded yet' : 'No logs match your filter'}
              </h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '380px', margin: '0.35rem auto 1.25rem' }}>
                {logs.length === 0
                  ? 'As screens play media items, playback verification receipts will stream here in real time.'
                  : 'Try adjusting your search query or screen filter.'}
              </p>
              {filteredLogs.length === 0 && logs.length > 0 && (
                <button
                  className="btn-secondary"
                  onClick={() => { setSearchQuery(''); setSelectedScreenFilter('ALL'); setSelectedStatusFilter('ALL'); }}
                  style={{ width: 'auto', display: 'inline-flex', padding: '0.4rem 1rem' }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Proof-of-Play Audit Ledger
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0 0' }}>
                    Showing {filteredLogs.length} verified playback receipts
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Download size={14} />
                  <span>CSV</span>
                </button>
              </div>

              <table className="fleet-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>TIMESTAMP</th>
                    <th style={{ width: '26%' }}>MEDIA ASSET</th>
                    <th style={{ width: '20%' }}>SCREEN</th>
                    <th style={{ width: '18%' }}>CAMPAIGN</th>
                    <th style={{ width: '14%', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    const playedDate = log.playedAt ? new Date(log.playedAt) : null;
                    const isCompleted = log.status === 'COMPLETED';

                    return (
                      <tr key={log.id}>
                        {/* Timestamp */}
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                            {playedDate ? playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {playedDate ? playedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </div>
                        </td>

                        {/* Media Asset with thumbnail */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '40px',
                              height: '24px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              background: '#0F172A',
                              flexShrink: 0
                            }}>
                              {log.mediaType?.startsWith('image') ? (
                                <img src={log.mediaUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <video src={log.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '160px'
                              }} title={log.mediaName}>
                                {log.mediaName}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {log.duration ? `${log.duration}s play` : 'Verified frame'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Screen */}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>
                            {log.screenName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Fleet Node
                          </div>
                        </td>

                        {/* Campaign */}
                        <td>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#334155' }}>
                            {log.campaignName || 'Standard Loop'}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isCompleted ? '#DCFCE7' : '#FEE2E2',
                            color: isCompleted ? '#15803D' : '#DC2626'
                          }}>
                            <span style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: isCompleted ? '#16A34A' : '#DC2626'
                            }}></span>
                            {isCompleted ? 'Verified' : (log.status || 'Flagged')}
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

        {/* Right Column: Screen Node Delivery & Audit Integrity */}
        <div>
          {/* Card 1: Delivery by Screen Node */}
          <div className="telemetry-card">
            <div className="telemetry-card-header" style={{ marginBottom: '0.85rem' }}>
              <div className="telemetry-card-title">
                <Tv size={17} />
                <span>Delivery by Screen Node</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{screens.length} Screens</span>
            </div>

            {screenNodeStats.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>No screens registered.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {screenNodeStats.slice(0, 6).map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedScreenFilter(node.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      background: selectedScreenFilter === node.name ? '#EFF6FF' : '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: node.isOnline ? '#10B981' : '#DC2626',
                        flexShrink: 0
                      }}></span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {node.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {node.location}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: node.playCount > 0 ? '#2563EB' : '#94A3B8',
                      fontFamily: 'monospace',
                      flexShrink: 0
                    }}>
                      {node.playCount} plays
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Proof-of-Play Integrity Summary */}
          <div className="telemetry-card" style={{ background: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={18} color="#059669" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>Proof-of-Play Integrity</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
              Every playback event is logged with screen ID, media file, timestamp, and duration for advertiser audit compliance.
            </p>
            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>SLA Compliance</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>{metrics.successRate}% Verified</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
