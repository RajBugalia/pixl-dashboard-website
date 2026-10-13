'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tv,
  Users,
  Film,
  CheckCircle2,
  AlertCircle,
  Plus,
  RotateCw,
  ArrowUpRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  Monitor,
  Radio,
  Layers,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import client from '@/api/client';

export default function MasterDashboard() {
  const [stats, setStats] = useState(null);
  const [screens, setScreens] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [proofLogs, setProofLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, screenRes, adminRes, proofRes] = await Promise.allSettled([
        client.get('/master/stats'),
        client.get('/master/screens'),
        client.get('/master/admins'),
        client.get('/master/proof-of-play')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (adminRes.status === 'fulfilled' && Array.isArray(adminRes.value?.data)) {
        setAdmins(adminRes.value.data);
      }
      if (proofRes.status === 'fulfilled' && Array.isArray(proofRes.value?.data)) {
        setProofLogs(proofRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching master dashboard data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Telemetry & Metrics (Strictly Real Data - NO temp, storage, ram)
  const metrics = useMemo(() => {
    const totalScreens = screens.length || stats?.totalScreens || 0;
    const activeScreens = screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length || stats?.activeScreens || 0;
    const offlineScreens = Math.max(0, totalScreens - activeScreens);
    const onlineRate = totalScreens > 0 ? Math.round((activeScreens / totalScreens) * 100) : 100;

    const totalAdmins = admins.length || stats?.totalAdmins || 0;
    const totalCampaigns = stats?.totalCampaigns || 0;

    // Proof of play metrics
    const totalReceipts = proofLogs.length;
    const completedReceipts = proofLogs.filter(p => p.status === 'COMPLETED').length;
    const successRate = totalReceipts > 0 ? ((completedReceipts / totalReceipts) * 100).toFixed(1) : '100.0';

    // Screens assigned to admins
    const assignedScreens = screens.filter(s => s.assignedAdmin && s.assignedAdmin !== 'Unassigned').length;

    return {
      totalScreens,
      activeScreens,
      offlineScreens,
      onlineRate,
      totalAdmins,
      totalCampaigns,
      totalReceipts,
      successRate,
      assignedScreens
    };
  }, [screens, admins, stats, proofLogs]);

  // Donut geometry
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const activeStroke = (circumference * metrics.onlineRate) / 100;
  const offlineStroke = circumference - activeStroke;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Master Command Center...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Operational Matrix Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HQ MASTER CONTROL MATRIX • MULTI-TENANT ENTERPRISE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Master Dashboard</h1>
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
              {metrics.activeScreens}/{metrics.totalScreens} Displays Online ({metrics.onlineRate}%)
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
              {metrics.totalAdmins} Tenant Admins
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Network-wide multi-tenant fleet overview, display pairing orchestrations, and centralized proof-of-play auditing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchData(true)}
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

          <Link
            href="/master/pair"
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <Plus size={18} />
            <span>Pair New Screen</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metrics Ribbon (4 Cards) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Network Displays */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Network Displays
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <Tv size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalScreens}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>{metrics.activeScreens} Online</span>
            <span>•</span>
            <span style={{ color: metrics.offlineScreens > 0 ? '#DC2626' : 'var(--text-secondary)' }}>
              {metrics.offlineScreens} Offline
            </span>
          </div>
        </div>

        {/* Card 2: Tenant Admins */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tenant Admins
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <Users size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalAdmins}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{metrics.assignedScreens}</strong> screens assigned to tenants
          </div>
        </div>

        {/* Card 3: Broadcast Campaigns */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Campaigns
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <Film size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalCampaigns}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Orchestrated across tenant displays
          </div>
        </div>

        {/* Card 4: Proof of Play Receipts */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Playback Receipts
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalReceipts}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>{metrics.successRate}%</span> Delivery Success Rate
          </div>
        </div>
      </div>

      {/* 3. Fleet Health Telemetry & Status Donut Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Fleet Telemetry &amp; Network Health
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Real-time synchronization status across all managed hardware displays
            </p>
          </div>
          <Link
            href="/master/screens"
            style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Manage All Screens <ArrowUpRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          {/* Donut Chart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth="14" />
                {/* Offline segment */}
                {metrics.offlineScreens > 0 && (
                  <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#EF4444" strokeWidth="14" strokeDasharray={circumference} strokeDashoffset="0" />
                )}
                {/* Online segment */}
                {metrics.activeScreens > 0 && (
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray={`${activeStroke} ${offlineStroke}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {metrics.totalScreens > 0 ? `${metrics.onlineRate}%` : '0%'}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                  ONLINE
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }}></span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{metrics.activeScreens} Online</span>
                <span style={{ color: 'var(--text-secondary)' }}>({metrics.onlineRate}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }}></span>
                <span style={{ fontWeight: 600, color: metrics.offlineScreens > 0 ? '#DC2626' : 'var(--text-primary)' }}>
                  {metrics.offlineScreens} Offline
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>({100 - metrics.onlineRate}%)</span>
              </div>
            </div>
          </div>

          {/* Telemetry Summary Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={18} color="#059669" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065F46' }}>
                    {metrics.activeScreens} Hardware Displays Online
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                    Broadcasting active campaign and standby loops
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                PASS
              </span>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: metrics.offlineScreens > 0 ? '#FEF2F2' : '#F8FAFC', border: metrics.offlineScreens > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {metrics.offlineScreens > 0 ? <AlertTriangle size={18} color="#DC2626" /> : <Monitor size={18} color="#64748B" />}
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: metrics.offlineScreens > 0 ? '#991B1B' : '#334155' }}>
                    {metrics.offlineScreens} Unreachable Nodes
                  </div>
                  <div style={{ fontSize: '0.75rem', color: metrics.offlineScreens > 0 ? '#B91C1C' : '#64748B' }}>
                    {metrics.offlineScreens > 0 ? 'Check device power and network connections' : 'All display gateways responding normally'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: metrics.offlineScreens > 0 ? '#FEE2E2' : '#F1F5F9', color: metrics.offlineScreens > 0 ? '#DC2626' : '#64748B', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                {metrics.offlineScreens > 0 ? 'ATTN' : 'OK'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Section (8 cols): Fleet Display Nodes & Admins Directory */}
        <div style={{ gridColumn: 'span 12', lg: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Managed Fleet Screens Table */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Managed Fleet Displays ({screens.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Live overview of registered Android TV players and paired displays
                </p>
              </div>
              <Link href="/master/screens" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                View All Screens <ChevronRight size={14} />
              </Link>
            </div>

            {screens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <Monitor size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.9rem', margin: '0 0 1rem' }}>No screens paired yet.</p>
                <Link href="/master/pair" className="btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}>
                  Pair First Screen
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Display Node</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Pairing Code</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Assigned Admin</th>
                      <th style={{ padding: '0.65rem 0.5rem' }}>Group</th>
                      <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screens.slice(0, 6).map(s => {
                      const isOnline = s.status === 'ONLINE' || s.status === 'ACTIVE';
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.location || 'Location Not Set'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <code style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {s.pairingCode}
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: s.assignedAdmin && s.assignedAdmin !== 'Unassigned' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {s.assignedAdmin || 'Unassigned'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {s.groupName ? (
                              <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                {s.groupName}
                              </span>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              background: isOnline ? '#DCFCE7' : '#FEE2E2',
                              color: isOnline ? '#15803D' : '#DC2626',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#16A34A' : '#DC2626' }}></span>
                              {isOnline ? 'Online' : 'Offline'}
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

          {/* Registered Tenant Admins Directory */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Tenant Admins Directory ({admins.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Registered administrative accounts managing regional screen clusters
                </p>
              </div>
              <Link href="/master/admins" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Manage Admins <ChevronRight size={14} />
              </Link>
            </div>

            {admins.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>No tenant admins registered.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {admins.map(admin => {
                  const adminScreenCount = screens.filter(s => s.assignedAdmin === admin.email).length;
                  return (
                    <div
                      key={admin.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}>
                          {admin.name ? admin.name[0].toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{admin.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{admin.email}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                          {adminScreenCount} {adminScreenCount === 1 ? 'Screen' : 'Screens'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Section (4 cols): Proof-of-Play Audit & Quick Navigation */}
        <aside style={{ gridColumn: 'span 12', lg: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick Action Shortcuts */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', margin: '0 0 0.85rem' }}>
              Quick Command Center
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href="/master/pair"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.15s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={16} color="var(--accent-color)" />
                  Pair New Player Screen
                </span>
                <ChevronRight size={14} color="#94A3B8" />
              </Link>

              <Link
                href="/master/admins"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} color="#059669" />
                  Manage Tenant Admins
                </span>
                <ChevronRight size={14} color="#94A3B8" />
              </Link>

              <Link
                href="/master/proof-of-play"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} color="#7C3AED" />
                  Proof of Play Audit Ledger
                </span>
                <ChevronRight size={14} color="#94A3B8" />
              </Link>
            </div>
          </div>

          {/* Recent Playback Audit Receipts */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', margin: 0 }}>
                  Live Audit Receipts
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600 }}>● Network Verification</span>
              </div>
              <Link href="/master/proof-of-play" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                View All
              </Link>
            </div>

            {proofLogs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>No playback receipts recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {proofLogs.slice(0, 5).map(log => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {log.screenName}
                      </span>
                      <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '0.65rem',
                        fontWeight: 700
                      }}>
                        Verified
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {log.campaignName} • {log.mediaName}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.68rem', color: '#94A3B8' }}>
                      <span>{log.duration}s broadcast</span>
                      <span>{log.adminEmail}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
