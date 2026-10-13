'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import client from '@/api/client';
import {
  Compass,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Zap,
  PlayCircle,
  ListMusic,
  UploadCloud,
  Monitor,
  Tv,
  Clock,
  ShieldCheck,
  Download,
  Check,
  WifiOff
} from 'lucide-react';

function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  try {
    let str = String(dateString).trim();
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      str += 'Z';
    }
    const diffMs = Date.now() - new Date(str).getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function formatTimeString(isoString) {
  if (!isoString) return '--:--';
  try {
    let str = String(isoString).trim();
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      str += 'Z';
    }
    return new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export default function AdminDashboard() {
  const [screens, setScreens] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [proofLogs, setProofLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(48);

  // Live telemetry sync ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncCountdown((prev) => (prev <= 1 ? 48 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [screenRes, campRes, proofRes] = await Promise.allSettled([
        client.get('/admin/screens'),
        client.get('/campaigns'),
        client.get('/admin/proof-of-play')
      ]);

      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (campRes.status === 'fulfilled' && Array.isArray(campRes.value?.data)) {
        setCampaigns(campRes.value.data);
      }
      if (proofRes.status === 'fulfilled' && Array.isArray(proofRes.value?.data)) {
        setProofLogs(proofRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Screen Status Distribution calculations (100% dynamic from backend)
  const totalScreens = screens.length;
  const activeScreens = screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length;
  const offlineScreens = totalScreens - activeScreens;
  const onlineRate = totalScreens > 0 ? Math.round((activeScreens / totalScreens) * 100) : 0;
  const activePercent = totalScreens > 0 ? ((activeScreens / totalScreens) * 100).toFixed(1) : '0.0';
  const offlinePercent = totalScreens > 0 ? ((offlineScreens / totalScreens) * 100).toFixed(1) : '0.0';

  const firstOfflineScreen = screens.find(s => s.status === 'OFFLINE' || s.status === 'INACTIVE');

  // Donut SVG circumference calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.42
  const activeStroke = totalScreens > 0 ? (circumference * onlineRate) / 100 : 0;
  const offlineStroke = circumference - activeStroke;

  // Active Now on Displays: maps real screens and correlates them with campaigns and proof of play
  const liveDisplayRows = useMemo(() => {
    const now = new Date();
    return screens.map((screen) => {
      const isOnline = screen.status === 'ONLINE' || screen.status === 'ACTIVE';

      // Find campaign assigned to this screen
      const assignedCampaign = campaigns.find(c => {
        if (!c.targetScreens || !Array.isArray(c.targetScreens)) return false;
        return c.targetScreens.some(ts => ts.id === screen.id);
      });

      const isLiveCampaign = assignedCampaign &&
        new Date(assignedCampaign.startDate) <= now &&
        new Date(assignedCampaign.endDate) >= now;

      // Find any recent playback proof image for this screen
      const recentProof = proofLogs.find(p => p.screenName === screen.name);

      return {
        id: screen.id,
        name: screen.name,
        location: screen.location || 'No location set',
        pairingCode: screen.pairingCode,
        groupName: screen.groupName || '',
        isOnline,
        previewUrl: recentProof?.mediaUrl || null,
        isLive: isOnline && isLiveCampaign,
        campaignName: assignedCampaign ? assignedCampaign.name : 'No Campaign Assigned',
        campaignDetail: assignedCampaign
          ? (assignedCampaign.layoutType === 'SPLIT'
              ? `Split (${assignedCampaign.splitRows}x${assignedCampaign.splitCols}) • ${assignedCampaign.playlist?.name || 'Multi-zone'}`
              : (assignedCampaign.playlist?.name ? `Playlist: ${assignedCampaign.playlist.name}` : 'Single Layout'))
          : (isOnline ? 'Standby loop' : 'Screen disconnected'),
        layoutTag: screen.groupName ? screen.groupName : (assignedCampaign?.layoutType === 'SPLIT' ? 'Split View' : 'Standard 16:9'),
        layoutColor: screen.groupName ? 'orange' : 'blue'
      };
    });
  }, [screens, campaigns, proofLogs]);

  // Today's Broadcasts: dynamically filtered from campaigns running or scheduled today
  const todaysBroadcasts = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Campaigns overlapping with today
    const activeToday = campaigns.filter(c => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return start <= endOfToday && end >= startOfToday;
    });

    // If there are no campaigns strictly overlapping today, check upcoming active campaigns
    const listToDisplay = activeToday.length > 0
      ? activeToday
      : campaigns.filter(c => new Date(c.endDate) >= startOfToday).slice(0, 5);

    return listToDisplay.map((c) => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      const isLive = now >= start && now <= end;
      const isPast = now > end;

      const screenCount = Array.isArray(c.targetScreens) ? c.targetScreens.length : 0;
      const screenNames = Array.isArray(c.targetScreens)
        ? c.targetScreens.map(s => s.name).filter(Boolean).join(', ')
        : '';

      return {
        id: c.id,
        name: c.name,
        timeRange: `${formatTimeString(c.startDate)} - ${formatTimeString(c.endDate)}`,
        isLive,
        isPast,
        screenCount,
        playlistName: c.playlist?.name || 'Custom Playlist',
        targetLocations: screenNames || (screenCount > 0 ? `${screenCount} fleet screens` : 'All assigned screens')
      };
    });
  }, [campaigns]);

  // Export Proof-of-Play audit trail to CSV from real backend logs
  const handleExportCSV = () => {
    if (proofLogs.length === 0) return;
    const headers = ['Timestamp', 'Screen', 'Campaign', 'Media Asset', 'Duration (s)', 'Status'];
    const rows = proofLogs.map(log => [
      `"${log.playedAt ? new Date(log.playedAt).toISOString() : new Date().toISOString()}"`,
      `"${log.screenName || 'Unknown Screen'}"`,
      `"${log.campaignName || 'Unknown Campaign'}"`,
      `"${log.mediaName || 'Media Clip'}"`,
      log.duration || 0,
      `"${log.status || 'VERIFIED'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `proof_of_play_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="telemetry-dashboard-layout">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Status Distribution & Active Displays Fleet */}
        {/* ========================================================= */}
        <div>
          {/* CARD 1: Screen Status Distribution */}
          <div className="telemetry-card">
            {/* Header */}
            <div className="telemetry-card-header">
              <div className="telemetry-card-title">
                <Compass size={18} />
                <span>Screen Status Distribution</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#047857' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                  {activeScreens} Active ({activePercent}%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#B91C1C' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }}></span>
                  {offlineScreens} Offline ({offlinePercent}%)
                </div>
                <button
                  onClick={() => fetchData(true)}
                  title="Refresh Telemetry"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'transform 0.3s'
                  }}
                >
                  <RotateCw size={15} className={refreshing ? 'spin-icon' : ''} />
                </button>
              </div>
            </div>

            {/* Donut Chart & Node Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '1.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
              {/* Circular Donut Gauge */}
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                  />
                  {totalScreens > 0 ? (
                    <>
                      {/* Offline Segment (Red) */}
                      {offlineScreens > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke="#991B1B"
                          strokeWidth="14"
                          strokeDasharray={circumference}
                          strokeDashoffset="0"
                        />
                      )}
                      {/* Active Segment (Green) */}
                      {activeScreens > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke="#047857"
                          strokeWidth="14"
                          strokeDasharray={`${activeStroke} ${offlineStroke}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.6s ease' }}
                        />
                      )}
                    </>
                  ) : null}
                </svg>

                {/* Donut Center Text */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                    {totalScreens > 0 ? `${onlineRate}%` : '0%'}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', marginTop: '0.25rem' }}>
                    ONLINE RATE
                  </span>
                </div>
              </div>

              {/* Status Metric Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Nodes Synchronized */}
                <div style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#10B981',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#065F46' }}>
                        {activeScreens} Nodes Synchronized
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.1rem' }}>
                        {activeScreens > 0 ? `Next sync cycle in ${syncCountdown}s` : 'No screens online'}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#065F46',
                    background: '#D1FAE5',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    {activeScreens > 0 ? 'PASS' : 'IDLE'}
                  </span>
                </div>

                {/* Offline / Unreachable Nodes */}
                <div style={{
                  background: offlineScreens > 0 ? '#FEF2F2' : '#F8FAFC',
                  border: offlineScreens > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: offlineScreens > 0 ? '#FEE2E2' : '#F1F5F9',
                      color: offlineScreens > 0 ? '#DC2626' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AlertTriangle size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: offlineScreens > 0 ? '#991B1B' : '#334155' }}>
                        {offlineScreens} Unreachable Nodes
                      </div>
                      <div style={{ fontSize: '0.75rem', color: offlineScreens > 0 ? '#B91C1C' : '#64748B', marginTop: '0.1rem' }}>
                        {offlineScreens > 0 ? 'Gateways offline or timed out' : 'All gateways responding normally'}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: offlineScreens > 0 ? '#DC2626' : '#059669',
                    background: offlineScreens > 0 ? '#FEE2E2' : '#DCFCE7',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    {offlineScreens > 0 ? 'FAIL' : 'OK'}
                  </span>
                </div>
              </div>
            </div>

            {/* Alert / Health Banner */}
            {firstOfflineScreen ? (
              <div style={{
                background: '#FFF1F2',
                border: '1px solid #FFE4E6',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AlertCircle size={18} color="#E11D48" />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                      {firstOfflineScreen.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.1rem' }}>
                      Offline • Location: {firstOfflineScreen.location || 'Unassigned'} • Pairing Code: <strong>{firstOfflineScreen.pairingCode}</strong>
                    </div>
                  </div>
                </div>
                <Link
                  href="/admin/screens"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#E11D48',
                    background: '#FFFFFF',
                    border: '1px solid #FECDD3',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  Inspect Hardware
                </Link>
              </div>
            ) : totalScreens > 0 ? (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #DCFCE7',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#166534' }}>
                    All {totalScreens} Nodes Online • Telemetry signals optimal across fleet
                  </div>
                </div>
                <Link
                  href="/admin/screens"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#166534',
                    background: '#FFFFFF',
                    border: '1px solid #BBF7D0',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    textDecoration: 'none'
                  }}
                >
                  View Screens
                </Link>
              </div>
            ) : (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Monitor size={18} color="#64748B" />
                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#475569' }}>
                    No screens registered yet. Pair an Android TV player to begin monitoring.
                  </div>
                </div>
                <Link
                  href="/admin/screens"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#2563EB',
                    background: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    textDecoration: 'none'
                  }}
                >
                  Pair Screen
                </Link>
              </div>
            )}
          </div>

          {/* CARD 2: Active Now on Displays (100% Dynamic from Backend) */}
          <div className="telemetry-card">
            {/* Header */}
            <div className="telemetry-card-header">
              <div className="telemetry-card-title">
                <Tv size={18} />
                <span>Active Now on Displays</span>
              </div>
              <div className="telemetry-live-badge">
                Real-time Telemetry
                <span className="telemetry-pulsing-dot"></span>
              </div>
            </div>

            {/* Content Table or Clean Empty State */}
            {liveDisplayRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                <Tv size={36} style={{ color: '#94A3B8', marginBottom: '0.6rem' }} />
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>No screens found</p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.25rem', color: '#64748B' }}>
                  Screens registered to your account will appear here with live playback status.
                </p>
                <Link
                  href="/admin/screens"
                  style={{
                    display: 'inline-block',
                    marginTop: '1rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    background: '#2563EB',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none'
                  }}
                >
                  Go to My Screens
                </Link>
              </div>
            ) : (
              <div className="fleet-table-container">
                <table className="fleet-table">
                  <thead>
                    <tr>
                      <th style={{ width: '32%' }}>DISPLAY & LOCATION</th>
                      <th style={{ width: '32%' }}>ACTIVE CAMPAIGN</th>
                      <th style={{ width: '20%' }}>LAYOUT / GROUP</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>PLAYBACK STATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveDisplayRows.map((node) => (
                      <tr key={node.id}>
                        {/* Column 1: Display & Location */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Screen Thumbnail / Frame */}
                            <div style={{
                              position: 'relative',
                              width: '50px',
                              height: '32px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: node.isOnline ? '#0F172A' : '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {!node.isOnline ? (
                                <WifiOff size={15} color="#94A3B8" />
                              ) : node.previewUrl ? (
                                <img
                                  src={node.previewUrl}
                                  alt="preview"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Monitor size={15} color="#94A3B8" />
                              )}
                              {node.isLive && (
                                <span style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  right: '2px',
                                  background: 'rgba(0, 0, 0, 0.75)',
                                  color: '#FACC15',
                                  fontSize: '0.52rem',
                                  fontWeight: 800,
                                  padding: '1px 3px',
                                  borderRadius: '3px',
                                  lineHeight: 1
                                }}>
                                  LIVE
                                </span>
                              )}
                            </div>

                            {/* Titles */}
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                                {node.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: node.isOnline ? '#64748B' : '#DC2626', marginTop: '0.1rem' }}>
                                {node.location} • Code: {node.pairingCode}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Active Campaign */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.85rem' }}>
                            {node.campaignName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                            {node.campaignDetail}
                          </div>
                        </td>

                        {/* Column 3: Layout / Group */}
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            display: 'inline-block',
                            background: node.layoutColor === 'orange' ? '#FFEDD5' : '#EFF6FF',
                            color: node.layoutColor === 'orange' ? '#C2410C' : '#2563EB'
                          }}>
                            {node.layoutTag}
                          </span>
                        </td>

                        {/* Column 4: Playback State */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: node.isOnline ? '#DCFCE7' : '#FEE2E2',
                            color: node.isOnline ? '#15803D' : '#DC2626'
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: node.isOnline ? '#16A34A' : '#DC2626'
                            }}></span>
                            {node.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Quick Actions, Broadcasts & Proof of Play  */}
        {/* ========================================================= */}
        <div>
          {/* CARD 3: Quick Actions */}
          <div className="telemetry-card">
            <div className="telemetry-card-header">
              <div className="telemetry-card-title">
                <span>Quick Actions</span>
              </div>
              <Zap size={16} color="#64748B" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Launch New Campaign */}
              <Link href="/admin/campaigns" className="qa-primary-card">
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <PlayCircle size={20} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF' }}>
                    Launch New Campaign
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#DBEAFE', marginTop: '0.15rem' }}>
                    Schedule split, targeted or programmatic ad loops.
                  </div>
                </div>
              </Link>

              {/* Create Playlist */}
              <Link href="/admin/playlists" className="qa-secondary-card">
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ListMusic size={17} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                    Create Playlist
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                    Combine multi-format clips
                  </div>
                </div>
              </Link>

              {/* Upload Media */}
              <Link href="/admin/media" className="qa-secondary-card">
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UploadCloud size={17} color="#059669" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                    Upload Media
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                    MP4, PNG, WebM up to 4K
                  </div>
                </div>
              </Link>

              {/* View All Screens */}
              <Link href="/admin/screens" className="qa-secondary-card">
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#FFF7ED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Monitor size={17} color="#EA580C" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                    View All Screens
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                    Filter full {totalScreens} fleet nodes
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* CARD 4: Today's Broadcasts (100% Dynamic from Backend Campaigns) */}
          <div className="telemetry-card">
            <div className="telemetry-card-header">
              <div className="telemetry-card-title">
                <Clock size={17} />
                <span>Today&apos;s Broadcasts</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {todaysBroadcasts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.75rem 0.5rem', color: '#64748B' }}>
                <Clock size={28} style={{ color: '#94A3B8', marginBottom: '0.4rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0F172A' }}>No broadcasts scheduled for today</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#64748B' }}>
                  Create and schedule a campaign to broadcast on screens.
                </p>
                <Link
                  href="/admin/campaigns"
                  style={{
                    display: 'inline-block',
                    marginTop: '0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#2563EB',
                    background: '#EFF6FF',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  Schedule Campaign
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1.25rem' }}>
                {/* Vertical timeline line */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  bottom: '12px',
                  left: '4px',
                  width: '2px',
                  background: '#E2E8F0'
                }}></div>

                {todaysBroadcasts.map((b) => (
                  <div key={b.id} style={{ position: 'relative' }}>
                    {/* Timeline bullet */}
                    <span style={{
                      position: 'absolute',
                      left: '-1.45rem',
                      top: '3px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: b.isLive ? '#10B981' : (b.isPast ? '#94A3B8' : '#2563EB'),
                      border: '2px solid #FFFFFF',
                      boxShadow: b.isLive ? '0 0 0 2px #A7F3D0' : (b.isPast ? 'none' : '0 0 0 2px #BFDBFE')
                    }}></span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: b.isLive ? '#047857' : (b.isPast ? '#64748B' : '#2563EB')
                      }}>
                        {b.timeRange} {b.isLive && '• LIVE'}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        background: '#F1F5F9',
                        color: '#64748B',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {b.screenCount} Screens
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                      {b.playlistName} • {b.targetLocations}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARD 5: Proof-of-Play Log (100% Dynamic from Backend) */}
          <div className="telemetry-card">
            <div className="telemetry-card-header">
              <div className="telemetry-card-title">
                <ShieldCheck size={18} />
                <span>Proof-of-Play Log</span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: proofLogs.length > 0 ? '#15803D' : '#64748B',
                background: proofLogs.length > 0 ? '#DCFCE7' : '#F1F5F9',
                padding: '0.2rem 0.55rem',
                borderRadius: '6px'
              }}>
                {proofLogs.length > 0 ? 'VERIFIED' : 'STANDBY'}
              </span>
            </div>

            {proofLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.75rem 0.5rem', color: '#64748B' }}>
                <ShieldCheck size={28} style={{ color: '#94A3B8', marginBottom: '0.4rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0F172A' }}>No playback logs yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#64748B' }}>
                  Playback receipts will stream here as screens play scheduled media.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                {proofLogs.slice(0, 5).map((log) => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: '1.5px solid #0D9488',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                      flexShrink: 0
                    }}>
                      <Check size={13} color="#0D9488" strokeWidth={2.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {log.mediaName || 'Broadcast Media Asset'}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {formatTimeAgo(log.playedAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                        Screen: {log.screenName || 'Display Node'} • {log.campaignName || 'Campaign'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with CSV Export */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid #F1F5F9'
            }}>
              <button
                onClick={handleExportCSV}
                disabled={proofLogs.length === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: proofLogs.length > 0 ? '#2563EB' : '#94A3B8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: proofLogs.length > 0 ? 'pointer' : 'not-allowed',
                  padding: 0
                }}
              >
                <span>Export audit trail (CSV)</span>
                <Download size={13} />
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {proofLogs.length} events logged
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .spin-icon {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
