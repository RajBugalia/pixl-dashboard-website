'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Tv,
  Search,
  Download,
  Film,
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import client from '@/api/client';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';

export default function MasterProofOfPlay() {
  const [logs, setLogs] = useState([]);
  const [screens, setScreens] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'SUMMARY' (Consolidated by Campaign + Media + Screen) or 'STREAM' (Individual playback receipts)
  const [viewMode, setViewMode] = useState('SUMMARY');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreenFilter, setSelectedScreenFilter] = useState('ALL');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  const loadData = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Robust ISO Parser ensuring UTC timestamps from DigitalOcean backend parse accurately in browser's local timezone
  const parsePlayedDate = useCallback((dateStr) => {
    if (!dateStr) return null;
    let str = String(dateStr).trim();
    // If backend sent ISO without timezone offset, append 'Z' so it's strictly parsed as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date(dateStr) : d;
  }, []);

  // Format Duration in mm:ss or human readable string
  const formatDuration = useCallback((seconds) => {
    const s = Math.round(Number(seconds) || 0);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  }, []);

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

  // Deduplicated Logs: Prevents duplicate packets with identical screen, media, campaign, and timestamp
  const deduplicatedLogs = useMemo(() => {
    const seen = new Set();
    return logs.filter(log => {
      const key = `${log.screenName || ''}__${log.mediaName || ''}__${log.campaignName || ''}__${log.playedAt || log.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [logs]);

  // Dynamic Telemetry Metrics (Real Data Only — Zero Hardware Telemetry)
  const metrics = useMemo(() => {
    const total = deduplicatedLogs.length;
    const completed = deduplicatedLogs.filter(l => l.status === 'COMPLETED').length;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '100.0';

    // Unique screens logging playback
    const uniqueLoggedScreens = new Set(deduplicatedLogs.map(l => l.screenName).filter(Boolean));

    // Unique admins with logged playback
    const uniqueLoggedAdmins = new Set(deduplicatedLogs.map(l => l.adminEmail).filter(Boolean));

    // Total airtime duration in seconds and hours
    const totalDurationSeconds = deduplicatedLogs.reduce((acc, l) => acc + (Number(l.duration) || 0), 0);
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
  }, [deduplicatedLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return deduplicatedLogs.filter(log => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchScreen = log.screenName?.toLowerCase().includes(q);
        const matchCampaign = log.campaignName?.toLowerCase().includes(q);
        const matchMedia = log.mediaName?.toLowerCase().includes(q);
        const matchAdmin = log.adminEmail?.toLowerCase().includes(q);
        if (!matchScreen && !matchCampaign && !matchMedia && !matchAdmin) return false;
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
  }, [deduplicatedLogs, searchQuery, selectedScreenFilter, selectedAdminFilter, selectedStatusFilter]);

  // Aggregated Summary Groups (Campaign + Media Asset + Screen)
  const aggregatedGroups = useMemo(() => {
    const map = new Map();
    filteredLogs.forEach(log => {
      const groupKey = `${log.campaignName || 'Standard Loop'}__${log.mediaName || 'Media'}__${log.screenName || 'Screen'}`;
      const logDate = parsePlayedDate(log.playedAt);

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          campaignName: log.campaignName || 'Standard Loop',
          mediaName: log.mediaName,
          mediaUrl: log.mediaUrl,
          mediaType: log.mediaType,
          screenName: log.screenName,
          adminEmail: log.adminEmail,
          totalPlays: 1,
          totalDuration: Number(log.duration) || 0,
          latestDate: logDate,
          status: log.status || 'COMPLETED'
        });
      } else {
        const existing = map.get(groupKey);
        existing.totalPlays += 1;
        existing.totalDuration += (Number(log.duration) || 0);
        if (logDate && (!existing.latestDate || logDate > existing.latestDate)) {
          existing.latestDate = logDate;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (!a.latestDate) return 1;
      if (!b.latestDate) return -1;
      return b.latestDate - a.latestDate;
    });
  }, [filteredLogs, parsePlayedDate]);

  // Pagination for Stream View
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset pagination on filter or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedScreenFilter, selectedAdminFilter, selectedStatusFilter, viewMode]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp (Local)', 'Screen', 'Tenant Admin', 'Campaign', 'Media Asset', 'Media Type', 'Airtime (seconds)', 'Status'];
    const rows = filteredLogs.map(log => {
      const d = parsePlayedDate(log.playedAt);
      const ts = d ? d.toLocaleString() : 'N/A';
      return [
        `"${ts}"`,
        `"${log.screenName || 'Unknown Screen'}"`,
        `"${log.adminEmail || 'Unassigned'}"`,
        `"${log.campaignName || 'Standard Loop'}"`,
        `"${log.mediaName || 'Media Clip'}"`,
        `"${log.mediaType || 'VIDEO'}"`,
        log.duration || 0,
        `"${log.status || 'COMPLETED'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `master_proof_of_play_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* 1. Header Section */}
      <PageHeader
        eyebrow="Hardware Audit Ledger • Real-Time Playback Proof"
        title="Proof of Play Analytics"
        badges={[
          {
            label: `${metrics.total} Verified Receipts`,
            bg: '#DCFCE7',
            color: '#15803D',
            dotColor: '#16A34A'
          }
        ]}
        description="Multi-tenant hardware audit ledger verifying real-time playback, broadcast durations, and campaign impressions."
        actions={
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="master-btn-primary"
            title="Export CSV"
            aria-label="Export master audit CSV"
          >
            <Download size={16} />
            <span>Export Master Audit (CSV)</span>
          </button>
        }
      />

      {/* 2. Top Metric Cards */}
      <div className="master-stat-grid">
        <MetricCard
          label="Playback Receipts"
          icon={Film}
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          value={metrics.total}
          description="Cryptographically audited impressions"
        />

        <MetricCard
          label="Playback SLA Met"
          icon={CheckCircle2}
          iconBg="#DCFCE7"
          iconColor="#15803D"
          value={`${metrics.successRate}%`}
          valueColor="#15803D"
          description="Hardware execution confirmation rate"
        />

        <MetricCard
          label="Displays Logged"
          icon={Tv}
          iconBg="#FEF3C7"
          iconColor="#D97706"
          value={metrics.uniqueLoggedScreensCount}
          description="Unique physical screens transmitting logs"
        />

        <MetricCard
          label="Total Airtime Logged"
          icon={Clock}
          iconBg="#F3E8FF"
          iconColor="#7E22CE"
          value={metrics.totalHours > 0 ? `${metrics.totalHours}h` : `${metrics.totalMinutes}m`}
          subtext={
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
              Across <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{metrics.uniqueLoggedAdminsCount}</strong> tenant {metrics.uniqueLoggedAdminsCount === 1 ? 'account' : 'accounts'}
            </span>
          }
        />
      </div>

      {/* 3. Search & Filter Controls Ribbon */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '360px' }}>
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

          {/* View Mode Toggle: Summary (Grouped) vs Stream (Raw Receipts) */}
          <div style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            borderRadius: '8px',
            padding: '3px',
            gap: '3px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('SUMMARY')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'SUMMARY' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'SUMMARY' ? '#0F172A' : '#64748B',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'SUMMARY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Layers size={14} />
              <span>Summary ({aggregatedGroups.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('STREAM')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'STREAM' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'STREAM' ? '#0F172A' : '#64748B',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'STREAM' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Activity size={14} />
              <span>Event Stream ({filteredLogs.length})</span>
            </button>
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
                All
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

      {/* 4. Main Table Section */}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748B' }}>
            <p>Loading master proof-of-play analytics...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
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
        ) : viewMode === 'SUMMARY' ? (
          /* VIEW 1: CONSOLIDATED SUMMARY (Aggregated by Campaign + Media + Screen) */
          <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Playback Summary by Campaign &amp; Asset ({aggregatedGroups.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Consolidates looping playback impressions into verified totals per screen &amp; tenant
                </p>
              </div>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {aggregatedGroups.length} unique assets broadcasting
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Media Asset</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Campaign</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Screen Node</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Tenant Admin</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Total Plays</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Latest Play (Local)</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedGroups.map(group => {
                  const latestDate = group.latestDate;

                  return (
                    <tr key={group.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {/* Media Asset Preview */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: 50,
                            height: 30,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: '#0F172A',
                            flexShrink: 0
                          }}>
                            {group.mediaType?.startsWith('image') ? (
                              <img src={group.mediaUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={group.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={group.mediaName}>
                              {group.mediaName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              Total Airtime: {formatDuration(group.totalDuration)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Campaign */}
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {group.campaignName}
                      </td>

                      {/* Screen */}
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {group.screenName}
                      </td>

                      {/* Tenant Admin */}
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {group.adminEmail || 'Unassigned'}
                      </td>

                      {/* Total Plays */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#EFF6FF',
                          color: '#2563EB'
                        }}>
                          {group.totalPlays} {group.totalPlays === 1 ? 'play' : 'plays'}
                        </span>
                      </td>

                      {/* Latest Play Time (Formatted in Local Time) */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {latestDate ? latestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {latestDate ? latestDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* VIEW 2: DETAILED EVENT STREAM (Paginated receipts with local time) */
          <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Playback Verification Ledger ({filteredLogs.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Showing page {currentPage} of {totalPages} ({filteredLogs.length} verified receipts total)
                </p>
              </div>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Audited hardware playback events
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Media Asset</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Screen Node</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Tenant Admin</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Campaign</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Airtime</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp (Local)</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map(log => {
                  const isCompleted = log.status === 'COMPLETED';
                  const playedDate = parsePlayedDate(log.playedAt);

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {/* Media Asset Preview */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: 50,
                            height: 30,
                            borderRadius: '6px',
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
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.mediaName}>
                              {log.mediaName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {log.mediaType || 'VIDEO'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Screen Node */}
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.screenName}
                      </td>

                      {/* Tenant Admin */}
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {log.adminEmail || 'Unassigned'}
                      </td>

                      {/* Campaign */}
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {log.campaignName || 'Standard Loop'}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.duration ? `${log.duration}s` : '10s'}
                      </td>

                      {/* Timestamp in User's Local Time */}
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {playedDate ? playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {playedDate ? playedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                marginTop: '0.75rem',
                borderTop: '1px solid #E2E8F0',
                fontSize: '0.82rem',
                color: '#64748B'
              }}>
                <div>
                  Page <strong style={{ color: '#0F172A' }}>{currentPage}</strong> of <strong style={{ color: '#0F172A' }}>{totalPages}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.78rem',
                      opacity: currentPage === 1 ? 0.4 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.78rem',
                      opacity: currentPage === totalPages ? 0.4 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
