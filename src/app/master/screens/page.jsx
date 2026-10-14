'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tv,
  Plus,
  RotateCw,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Users,
  Layers,
  Grid,
  LayoutList,
  MoreVertical,
  X,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import client from '@/api/client';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';

export default function MasterScreens() {
  const [screens, setScreens] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ONLINE' | 'OFFLINE'
  const [adminFilter, setAdminFilter] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | specific admin email
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [screenRes, adminRes] = await Promise.allSettled([
        client.get('/master/screens'),
        client.get('/master/admins')
      ]);

      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (adminRes.status === 'fulfilled' && Array.isArray(adminRes.value?.data)) {
        setAdmins(adminRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching master screens:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Dynamic Telemetry (Real Data Only — NO temp, storage, ram)
  const metrics = useMemo(() => {
    const total = screens.length;
    const online = screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length;
    const offline = total - online;
    const onlineRate = total > 0 ? Math.round((online / total) * 100) : 100;

    const assigned = screens.filter(s => s.assignedAdmin && s.assignedAdmin !== 'Unassigned').length;
    const unassigned = total - assigned;

    // Distinct groups
    const groups = Array.from(new Set(screens.map(s => s.groupName?.trim()).filter(Boolean)));

    // Distinct assigned admins
    const uniqueAssignedAdmins = Array.from(new Set(screens.map(s => s.assignedAdmin).filter(a => a && a !== 'Unassigned')));

    return {
      total,
      online,
      offline,
      onlineRate,
      assigned,
      unassigned,
      groupsCount: groups.length,
      uniqueAssignedAdminsCount: uniqueAssignedAdmins.length
    };
  }, [screens]);

  // Distinct groups for dropdown
  const distinctGroups = useMemo(() => {
    return Array.from(new Set(screens.map(s => s.groupName?.trim()).filter(Boolean)));
  }, [screens]);

  // Filtered Screens
  const filteredScreens = useMemo(() => {
    return screens.filter(screen => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = screen.name?.toLowerCase().includes(q);
        const matchesLocation = screen.location?.toLowerCase().includes(q);
        const matchesCode = screen.pairingCode?.toLowerCase().includes(q);
        const matchesAdmin = screen.assignedAdmin?.toLowerCase().includes(q);
        const matchesGroup = screen.groupName?.toLowerCase().includes(q);
        if (!matchesName && !matchesLocation && !matchesCode && !matchesAdmin && !matchesGroup) return false;
      }

      // Status
      const isOnline = screen.status === 'ONLINE' || screen.status === 'ACTIVE';
      if (statusFilter === 'ONLINE' && !isOnline) return false;
      if (statusFilter === 'OFFLINE' && isOnline) return false;

      // Admin
      if (adminFilter === 'UNASSIGNED') {
        if (screen.assignedAdmin && screen.assignedAdmin !== 'Unassigned') return false;
      } else if (adminFilter !== 'ALL') {
        if (screen.assignedAdmin !== adminFilter) return false;
      }

      // Group
      if (groupFilter !== 'ALL') {
        if (screen.groupName !== groupFilter) return false;
      }

      return true;
    });
  }, [screens, searchQuery, statusFilter, adminFilter, groupFilter]);

  // Delete Screen
  const handleDeleteClick = (screen) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Delete Screen Node?',
      text: `Are you sure you want to delete "${screen.name}"? This will detach the hardware display from campaigns and proof logs.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, delete screen'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: 'Deleting Display...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          await client.delete(`/master/screens/${screen.id}`);
          setScreens(prev => prev.filter(s => s.id !== screen.id));

          Swal.fire({
            icon: 'success',
            title: 'Display Deleted',
            text: 'Screen removed from network fleet.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.response?.data?.error || 'Failed to delete screen'
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Network Screens Fleet...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Command Bar */}
      <PageHeader
        eyebrow="HQ Multi-Tenant Fleet • Hardware Display Mesh"
        title="Manage Screens"
        badges={[
          {
            label: `${metrics.online}/${metrics.total} Displays Online (${metrics.onlineRate}%)`,
            bg: '#DCFCE7',
            color: '#15803D',
            dotColor: '#16A34A'
          },
          {
            label: `${metrics.assigned} Assigned to Tenants`,
            bg: '#DBEAFE',
            color: '#1D4ED8'
          }
        ]}
        description="Centralized registry of all paired Android TV hardware displays, pairing codes, and regional tenant assignments."
        actions={
          <>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="master-btn-secondary"
              title="Reload Display Telemetry"
              aria-label="Reload display telemetry"
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

      {/* 2. Top Metric Telemetry Cards */}
      <div className="master-stat-grid">
        <MetricCard
          label="Network Displays"
          icon={Tv}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          value={metrics.total}
          status={{ online: metrics.online, offline: metrics.offline }}
        />

        <MetricCard
          label="Managing Tenants"
          icon={Users}
          iconBg="#ECFDF5"
          iconColor="#059669"
          value={metrics.uniqueAssignedAdminsCount}
          description="Active regional tenant admins"
        />

        <MetricCard
          label="Display Groups"
          icon={Layers}
          iconBg="#FEF3C7"
          iconColor="#D97706"
          value={metrics.groupsCount}
          description="Configured geographic sync clusters"
        />

        <MetricCard
          label="Fleet Health"
          icon={ShieldCheck}
          iconBg="#F3E8FF"
          iconColor="#7E22CE"
          value={`${metrics.onlineRate}%`}
          subtext={
            <span style={{ fontWeight: 600 }}>
              <span style={{ color: '#15803D' }}>{metrics.online} of {metrics.total}</span> online
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
              placeholder="Search screen, code, location, admin..."
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

          {/* Filters & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => setStatusFilter('ALL')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'ALL' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: statusFilter === 'ALL' ? 600 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                All ({screens.length})
              </button>
              <button
                onClick={() => setStatusFilter('ONLINE')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'ONLINE' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'ONLINE' ? '#15803D' : 'var(--text-secondary)',
                  fontWeight: statusFilter === 'ONLINE' ? 600 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Online ({metrics.online})
              </button>
              <button
                onClick={() => setStatusFilter('OFFLINE')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'OFFLINE' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'OFFLINE' ? '#DC2626' : 'var(--text-secondary)',
                  fontWeight: statusFilter === 'OFFLINE' ? 600 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Offline ({metrics.offline})
              </button>
            </div>

            {/* Admin Filter Dropdown */}
            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="input-field"
              style={{ height: '38px', paddingBlock: 0, fontSize: '0.82rem', paddingInline: '0.65rem' }}
            >
              <option value="ALL">All Tenant Admins</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {admins.map(a => (
                <option key={a.id} value={a.email}>
                  Admin: {a.name || a.email}
                </option>
              ))}
            </select>

            {/* Group Filter Dropdown */}
            {distinctGroups.length > 0 && (
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="input-field"
                style={{ height: '38px', paddingBlock: 0, fontSize: '0.82rem', paddingInline: '0.65rem' }}
              >
                <option value="ALL">All Groups</option>
                {distinctGroups.map(g => (
                  <option key={g} value={g}>
                    Group: {g}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <Grid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Screens Display Area */}
      {filteredScreens.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          <Tv size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No Displays Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            {searchQuery
              ? `No screen matches "${searchQuery}". Try adjusting your search or filters.`
              : 'No hardware player screens exist in this network view yet.'}
          </p>
          <Link
            href="/master/pair"
            className="btn-primary"
            style={{ width: 'auto', margin: '0 auto', padding: '0.5rem 1.5rem', textDecoration: 'none', display: 'inline-block' }}
          >
            + Pair New Screen
          </Link>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="glass-panel" style={{ padding: '1.25rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.75rem 0.75rem' }}>Display Node</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Location</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Pairing Code</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Assigned Tenant</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Group Cluster</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScreens.map(screen => {
                const isOnline = screen.status === 'ONLINE' || screen.status === 'ACTIVE';
                const hasAdmin = screen.assignedAdmin && screen.assignedAdmin !== 'Unassigned';

                return (
                  <tr key={screen.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {/* Display Node */}
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: isOnline ? '#EFF6FF' : '#F8FAFC',
                          color: isOnline ? 'var(--accent-color)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #E2E8F0'
                        }}>
                          <Tv size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{screen.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID #{screen.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {screen.location || 'Location Not Set'}
                    </td>

                    {/* Pairing Code */}
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <code style={{ background: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                        {screen.pairingCode}
                      </code>
                    </td>

                    {/* Assigned Tenant */}
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      {hasAdmin ? (
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {screen.assignedAdmin}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: '#FEF3C7',
                          color: '#B45309',
                          fontWeight: 700
                        }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Group */}
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      {screen.groupName ? (
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          fontWeight: 700
                        }}>
                          {screen.groupName}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.85rem 0.75rem' }}>
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

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <Link
                          href={`/master/pair?code=${encodeURIComponent(screen.pairingCode || '')}&screenName=${encodeURIComponent(screen.name || '')}`}
                          title="Re-pair or Assign"
                          className="master-table-action-btn"
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #DBEAFE',
                            color: 'var(--accent-color)'
                          }}
                        >
                          <span>Pair</span>
                          <ArrowUpRight size={13} />
                        </Link>

                        <button
                          onClick={() => handleDeleteClick(screen)}
                          className="master-table-icon-btn"
                          style={{
                            background: '#FFF1F2',
                            border: '1px solid #FFE4E6',
                            color: '#E11D48'
                          }}
                          title="Delete Screen"
                          aria-label={`Delete screen ${screen.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
          {filteredScreens.map(screen => {
            const isOnline = screen.status === 'ONLINE' || screen.status === 'ACTIVE';
            const hasAdmin = screen.assignedAdmin && screen.assignedAdmin !== 'Unassigned';

            return (
              <div
                key={screen.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--glass-border)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        background: isOnline ? '#EFF6FF' : '#F8FAFC',
                        color: isOnline ? 'var(--accent-color)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #E2E8F0'
                      }}>
                        <Tv size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {screen.name}
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          ID #{screen.id}
                        </span>
                      </div>
                    </div>

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
                  </div>

                  {/* Metadata */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    <div>
                      📍 <span>{screen.location || 'Location Not Set'}</span>
                    </div>
                    <div>
                      🔑 Code: <strong style={{ color: 'var(--text-primary)' }}>{screen.pairingCode}</strong>
                    </div>
                    {screen.groupName && (
                      <div>
                        🏷️ Group: <strong style={{ color: '#1D4ED8' }}>{screen.groupName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Assigned Admin Banner */}
                  <div style={{
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    background: hasAdmin ? '#F8FAFC' : '#FEF3C7',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.78rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Assigned Tenant: </span>
                    <strong style={{ color: hasAdmin ? 'var(--text-primary)' : '#B45309' }}>
                      {hasAdmin ? screen.assignedAdmin : 'Unassigned'}
                    </strong>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <Link
                    href={`/master/pair?code=${encodeURIComponent(screen.pairingCode || '')}&screenName=${encodeURIComponent(screen.name || '')}`}
                    className="master-table-action-btn"
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      color: 'var(--accent-color)'
                    }}
                  >
                    <span>Pair / Assign</span>
                    <ArrowUpRight size={13} />
                  </Link>

                  <button
                    onClick={() => handleDeleteClick(screen)}
                    className="master-table-icon-btn"
                    style={{
                      background: '#FFF1F2',
                      border: '1px solid #FFE4E6',
                      color: '#E11D48'
                    }}
                    title="Delete Screen"
                    aria-label={`Delete screen ${screen.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
