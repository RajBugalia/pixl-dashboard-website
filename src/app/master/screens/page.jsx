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
  ArrowUpRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import client from '@/api/client';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HQ MULTI-TENANT FLEET • HARDWARE DISPLAY MESH
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Manage Screens</h1>
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
              {metrics.online}/{metrics.total} Displays Online ({metrics.onlineRate}%)
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
              {metrics.assigned} Assigned to Tenants
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Centralized registry of all paired Android TV hardware displays, pairing codes, and regional tenant assignments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Reload Display Telemetry"
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

      {/* 2. Top Metric Telemetry Cards (Real Data Only — Zero Hardware Telemetry) */}
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
            {metrics.total}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>{metrics.online} Online</span>
            <span>•</span>
            <span style={{ color: metrics.offline > 0 ? '#DC2626' : 'var(--text-secondary)' }}>
              {metrics.offline} Offline
            </span>
          </div>
        </div>

        {/* Card 2: Tenant Admins */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Managing Tenants
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <Users size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.uniqueAssignedAdminsCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Active regional tenants managing displays
          </div>
        </div>

        {/* Card 3: Display Groups */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Display Groups
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <Layers size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.groupsCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Configured regional synchronization clusters
          </div>
        </div>

        {/* Card 4: Unassigned Pool */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Unassigned Pool
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE' }}>
              <Monitor size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.unassigned}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Screens available to reassign or pair
          </div>
        </div>
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
                          style={{
                            padding: '0.35rem 0.55rem',
                            borderRadius: '6px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: 'var(--accent-color)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          Pair <ArrowUpRight size={12} />
                        </Link>

                        <button
                          onClick={() => handleDeleteClick(screen)}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            background: '#FFF1F2',
                            border: '1px solid #FFE4E6',
                            color: '#E11D48',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Delete Screen"
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
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    href={`/master/pair?code=${encodeURIComponent(screen.pairingCode || '')}&screenName=${encodeURIComponent(screen.name || '')}`}
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--accent-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      textDecoration: 'none'
                    }}
                  >
                    Pair / Assign <ArrowUpRight size={13} />
                  </Link>

                  <button
                    onClick={() => handleDeleteClick(screen)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete Screen"
                  >
                    <Trash2 size={16} />
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
