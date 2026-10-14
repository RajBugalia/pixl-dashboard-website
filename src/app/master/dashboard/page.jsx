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
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';

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
      <PageHeader
        eyebrow="HQ Master Control Matrix • Multi-Tenant Enterprise"
        title="Master Dashboard"
        badges={[
          {
            label: `${metrics.activeScreens}/${metrics.totalScreens} Displays Online (${metrics.onlineRate}%)`,
            bg: '#DCFCE7',
            color: '#15803D',
            dotColor: '#16A34A'
          },
          {
            label: `${metrics.totalAdmins} Tenant Admins`,
            bg: '#DBEAFE',
            color: '#1D4ED8'
          }
        ]}
        description="Network-wide multi-tenant fleet overview, display pairing orchestrations, and centralized proof-of-play auditing."
        actions={
          <>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="master-btn-secondary"
              title="Reload Network Telemetry"
              aria-label="Reload network telemetry"
            >
              <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <Link
              href="/master/pair"
              className="master-btn-primary"
            >
              <Plus size={16} />
              <span>Pair New Screen</span>
            </Link>
          </>
        }
      />

      {/* 2. Top Metrics Ribbon (4 Cards) */}
      <div className="master-stat-grid">
        <MetricCard
          label="Network Displays"
          icon={Tv}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          value={metrics.totalScreens}
          status={{ online: metrics.activeScreens, offline: metrics.offlineScreens }}
        />

        <MetricCard
          label="Tenant Admins"
          icon={Users}
          iconBg="#ECFDF5"
          iconColor="#059669"
          value={metrics.totalAdmins}
          subtext={
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{metrics.assignedScreens}</strong>{' '}
              {metrics.assignedScreens === 1 ? 'screen' : 'screens'} assigned to tenants
            </span>
          }
        />

        <MetricCard
          label="Active Campaigns"
          icon={Film}
          iconBg="#FEF3C7"
          iconColor="#D97706"
          value={metrics.totalCampaigns}
          description="Orchestrated across tenant displays"
        />

        <MetricCard
          label="Playback Receipts"
          icon={ShieldCheck}
          iconBg="#F3E8FF"
          iconColor="#7E22CE"
          value={metrics.totalReceipts}
          subtext={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <strong style={{ color: '#15803D', fontWeight: 700 }}>{metrics.successRate}%</strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>Delivery Success Rate</span>
            </span>
          }
        />
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

        <div className="master-telemetry-health-grid">
          {/* Donut Chart & Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
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
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {metrics.totalScreens > 0 ? `${metrics.onlineRate}%` : '0%'}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                  ONLINE
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '130px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} aria-hidden="true"></span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{metrics.activeScreens} Online</span>
                <span style={{ color: 'var(--text-secondary)' }}>({metrics.onlineRate}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} aria-hidden="true"></span>
                <span style={{ fontWeight: 600, color: metrics.offlineScreens > 0 ? '#DC2626' : 'var(--text-primary)' }}>
                  {metrics.offlineScreens} Offline
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>({100 - metrics.onlineRate}%)</span>
              </div>
            </div>
          </div>

          {/* Telemetry Status Cards (Strictly Equal Sizing) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '62px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065F46', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {metrics.activeScreens} Hardware Displays Online
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#047857', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Broadcasting active campaign and standby loops
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '0.2rem 0.55rem', borderRadius: '6px', flexShrink: 0, marginLeft: '0.5rem' }}>
                PASS
              </span>
            </div>

            <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: metrics.offlineScreens > 0 ? '#FEF2F2' : '#F8FAFC', border: metrics.offlineScreens > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '62px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {metrics.offlineScreens > 0 ? <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} /> : <Monitor size={20} color="#64748B" style={{ flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: metrics.offlineScreens > 0 ? '#991B1B' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {metrics.offlineScreens} Unreachable Nodes
                  </div>
                  <div style={{ fontSize: '0.75rem', color: metrics.offlineScreens > 0 ? '#B91C1C' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {metrics.offlineScreens > 0 ? 'Check device power and network connections' : 'All display gateways responding normally'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: metrics.offlineScreens > 0 ? '#FEE2E2' : '#F1F5F9', color: metrics.offlineScreens > 0 ? '#DC2626' : '#64748B', padding: '0.2rem 0.55rem', borderRadius: '6px', flexShrink: 0, marginLeft: '0.5rem' }}>
                {metrics.offlineScreens > 0 ? 'ATTN' : 'OK'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout */}
      <div className="master-two-col">
        {/* Left Section: Fleet Display Nodes & Admins Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
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
                            <code style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {s.pairingCode}
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: s.assignedAdmin && s.assignedAdmin !== 'Unassigned' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {s.assignedAdmin || 'Unassigned'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {s.groupName ? (
                              <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.45rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
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
                        borderRadius: '8px',
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

        {/* Right Section: Proof-of-Play Audit & Quick Navigation */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          {/* Quick Action Shortcuts */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.85rem' }}>
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
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                  Live Audit Receipts
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }}></span>
                  Network Verification
                </span>
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
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '0.72rem',
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
