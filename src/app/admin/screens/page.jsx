'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tv,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Search,
  LayoutGrid,
  List,
  RotateCw,
  Tag,
  MapPin,
  MoreVertical,
  WifiOff,
  Monitor
} from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function AdminScreens() {
  const [screens, setScreens] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [activeMenuId, setActiveMenuId] = useState(null);

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
      const [screenRes, campRes] = await Promise.allSettled([
        client.get('/admin/screens'),
        client.get('/campaigns')
      ]);

      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (campRes.status === 'fulfilled' && Array.isArray(campRes.value?.data)) {
        setCampaigns(campRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load screen data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute distinct groups
  const existingGroups = useMemo(() => {
    return Array.from(new Set(screens.map(s => s.groupName).filter(Boolean)));
  }, [screens]);

  // Quick statistics
  const stats = useMemo(() => {
    const total = screens.length;
    const online = screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length;
    const offline = total - online;
    const uptime = total > 0 ? ((online / total) * 100).toFixed(1) : '100.0';
    return { total, online, offline, uptime, groupsCount: existingGroups.length };
  }, [screens, existingGroups]);

  // Assign or remove group for a single screen
  const handleAssignGroup = (screen) => {
    setActiveMenuId(null);

    const groupOptionsHtml = existingGroups.length > 0
      ? `<div style="margin-bottom: 1rem; text-align: left;">
           <label style="font-size: 0.85rem; color: #6b7280; font-weight: 500;">Select an existing group or type a new one below:</label>
           <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
             ${existingGroups.map(g => `<button type="button" class="swal-group-chip" data-group="${g}" style="padding: 0.35rem 0.75rem; border-radius: 9999px; border: 1px solid #d1d5db; background: #f9fafb; font-size: 0.85rem; cursor: pointer; transition: all 0.15s;">🏷️ ${g}</button>`).join('')}
           </div>
         </div>`
      : '';

    Swal.fire({
      title: 'Assign Group / Location',
      html: `
        <p style="font-size: 0.9rem; color: #6b7280; margin-bottom: 1rem;">
          Organize <strong>"${screen.name}"</strong> by city or location (e.g., Airport, Concourse, Lobby).
        </p>
        ${groupOptionsHtml}
        <input id="swal-group-input" class="swal2-input" placeholder="Enter group name" value="${screen.groupName || ''}" style="margin: 0.5rem auto 0 auto; width: 100%; box-sizing: border-box;" />
      `,
      showCancelButton: true,
      showDenyButton: !!screen.groupName,
      confirmButtonText: 'Save Group',
      denyButtonText: 'Remove from Group',
      confirmButtonColor: '#2563EB',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      didOpen: () => {
        const input = document.getElementById('swal-group-input');
        document.querySelectorAll('.swal-group-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            if (input) input.value = chip.getAttribute('data-group');
          });
        });
      },
      preConfirm: () => {
        const input = document.getElementById('swal-group-input');
        return input ? input.value.trim() : '';
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const newGroup = result.value;
        try {
          Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.put(`/admin/screens/${screen.id}/group`, { groupName: newGroup || null });
          setScreens(screens.map(s => s.id === screen.id ? { ...s, groupName: newGroup || null } : s));
          Swal.fire({ icon: 'success', title: 'Group Saved', timer: 1200, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Failed to update group' });
        }
      } else if (result.isDenied) {
        try {
          Swal.fire({ title: 'Removing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.put(`/admin/screens/${screen.id}/group`, { groupName: null });
          setScreens(screens.map(s => s.id === screen.id ? { ...s, groupName: null } : s));
          Swal.fire({ icon: 'success', title: 'Removed from Group', timer: 1200, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Failed to remove group' });
        }
      }
    });
  };

  // Create new group and assign screens in bulk
  const handleCreateNewGroup = () => {
    Swal.fire({
      title: 'Create Screen Group',
      text: 'Enter a group name based on city, branch, or location (e.g. "Airport Terminal 3", "Flagship Stores")',
      input: 'text',
      inputPlaceholder: 'e.g. North Zone',
      showCancelButton: true,
      confirmButtonText: 'Next',
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#9ca3af',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Please enter a group name';
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const groupName = result.value.trim();
        if (screens.length === 0) {
          Swal.fire({ icon: 'info', title: 'No screens', text: 'You do not have any screens to assign yet.' });
          return;
        }

        const checkboxesHtml = screens.map(s => `
          <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer; text-align: left;">
            <input type="checkbox" class="swal-screen-checkbox" value="${s.id}" ${s.groupName === groupName ? 'checked' : ''} />
            <span>${s.name} <small style="color: #6b7280;">(${s.groupName ? 'Current: ' + s.groupName : 'Ungrouped'})</small></span>
          </label>
        `).join('');

        Swal.fire({
          title: `Assign Screens to "${groupName}"`,
          html: `<div style="max-height: 250px; overflow-y: auto; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">${checkboxesHtml}</div>`,
          showCancelButton: true,
          confirmButtonText: 'Save Group',
          confirmButtonColor: '#2563EB',
          cancelButtonColor: '#9ca3af',
          preConfirm: () => {
            return Array.from(document.querySelectorAll('.swal-screen-checkbox:checked')).map(cb => cb.value);
          }
        }).then(async (selResult) => {
          if (selResult.isConfirmed) {
            Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
              const selectedIds = selResult.value;
              await Promise.all(selectedIds.map(id => client.put(`/admin/screens/${id}/group`, { groupName })));
              loadData();
              Swal.fire({ icon: 'success', title: 'Group Created!', text: `Screens assigned to ${groupName}`, timer: 1500, showConfirmButton: false });
            } catch (err) {
              Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Failed to assign screens to group' });
            }
          }
        });
      }
    });
  };

  // Filtered screens based on search query, group, and status
  const filteredScreens = useMemo(() => {
    return screens.filter(s => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesLoc = s.location?.toLowerCase().includes(q);
        const matchesCode = s.pairingCode?.toLowerCase().includes(q);
        const matchesGroup = s.groupName?.toLowerCase().includes(q);
        if (!matchesName && !matchesLoc && !matchesCode && !matchesGroup) return false;
      }

      // Group filter
      if (selectedGroupFilter !== 'ALL') {
        if (selectedGroupFilter === 'UNGROUPED') {
          if (s.groupName) return false;
        } else if (s.groupName !== selectedGroupFilter) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        const isOnline = s.status === 'ONLINE' || s.status === 'ACTIVE';
        if (selectedStatusFilter === 'ONLINE' && !isOnline) return false;
        if (selectedStatusFilter === 'OFFLINE' && isOnline) return false;
      }

      return true;
    });
  }, [screens, searchQuery, selectedGroupFilter, selectedStatusFilter]);

  // Helper to find active campaign on a screen
  const getScreenCampaign = (screenId) => {
    const now = new Date();
    return campaigns.find(c => {
      if (!c.targetScreens || !Array.isArray(c.targetScreens)) return false;
      const isTargeted = c.targetScreens.some(ts => ts.id === screenId);
      if (!isTargeted) return false;
      return new Date(c.startDate) <= now && new Date(c.endDate) >= now;
    }) || campaigns.find(c => c.targetScreens?.some(ts => ts.id === screenId));
  };

  return (
    <>
      {/* Main View Title & Control Action Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>My Screens</h1>
            <span style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#E2E8F0',
              color: '#0F172A',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {stats.total} Configured
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage, monitor, and configure all physical displays assigned to your administrative fleet.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'grid' ? '#2563EB' : '#64748B',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#2563EB' : '#64748B',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <List size={15} />
              <span>Table</span>
            </button>
          </div>

          {/* New Group Button */}
          <button
            onClick={handleCreateNewGroup}
            className="btn-secondary"
            style={{
              width: 'auto',
              padding: '0.5rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            <FolderPlus size={16} />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* Fleet Quick Stats Filter Rail (Stitch Design) */}
      <div className="screens-stat-grid">
        {/* Stat 1: All Displays */}
        <div
          className="screen-stat-card"
          onClick={() => { setSelectedGroupFilter('ALL'); setSelectedStatusFilter('ALL'); }}
          style={{ cursor: 'pointer' }}
        >
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
              <Tv size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                All Displays
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{stats.total}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Total units</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>Fleet 100%</span>
        </div>

        {/* Stat 2: Online & Active */}
        <div
          className="screen-stat-card"
          onClick={() => setSelectedStatusFilter('ONLINE')}
          style={{ cursor: 'pointer', borderColor: selectedStatusFilter === 'ONLINE' ? '#10B981' : undefined }}
        >
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
                Online & Active
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{stats.online}</span>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>{stats.uptime}% uptime</span>
              </div>
            </div>
          </div>
          <span className="telemetry-pulsing-dot" style={{ width: 10, height: 10 }}></span>
        </div>

        {/* Stat 3: Needs Attention */}
        <div
          className="screen-stat-card"
          onClick={() => setSelectedStatusFilter('OFFLINE')}
          style={{ cursor: 'pointer', borderColor: selectedStatusFilter === 'OFFLINE' ? '#EF4444' : undefined }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Needs Attention
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626' }}>{stats.offline}</span>
                <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 500 }}>
                  {stats.offline > 0 ? 'Disconnected' : 'All responding'}
                </span>
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            background: stats.offline > 0 ? '#FEE2E2' : '#DCFCE7',
            color: stats.offline > 0 ? '#DC2626' : '#15803D'
          }}>
            {stats.offline > 0 ? 'Action req.' : 'Optimal'}
          </span>
        </div>

        {/* Stat 4: Configured Groups */}
        <div
          className="screen-stat-card"
          onClick={handleCreateNewGroup}
          style={{ cursor: 'pointer' }}
        >
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
              <FolderPlus size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Screen Groups
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7C3AED' }}>{stats.groupsCount}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Active zones</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>Organize</span>
        </div>
      </div>

      {/* Filter, Search & Group Toolbar (Stitch Design) */}
      <div className="screens-toolbar">
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by screen name, location, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Zone / Group Dropdown */}
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
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
            <option value="ALL">All Zones ({screens.length})</option>
            {existingGroups.map(grp => (
              <option key={grp} value={grp}>
                Zone: {grp} ({screens.filter(s => s.groupName === grp).length})
              </option>
            ))}
            <option value="UNGROUPED">Ungrouped Screens</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
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
            <option value="ONLINE">Online Only</option>
            <option value="OFFLINE">Offline Only</option>
          </select>
        </div>
      </div>

      {/* Main Content Area: Cards or Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748B' }}>
          <RotateCw size={24} className="spin-icon" style={{ marginRight: '0.5rem' }} />
          <span>Loading screens...</span>
        </div>
      ) : screens.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem', color: '#64748B' }}>
          <Tv size={42} style={{ color: '#94A3B8', marginBottom: '0.75rem' }} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>No screens registered yet</h2>
          <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '420px', margin: '0.35rem auto 1.25rem' }}>
            To connect a physical display, pair your Android TV player using the pair code or request assignment from your Master Administrator.
          </p>
        </div>
      ) : filteredScreens.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A' }}>No screens match your filters</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedGroupFilter('ALL'); setSelectedStatusFilter('ALL'); }}
            className="btn-secondary"
            style={{ width: 'auto', margin: '1rem auto 0 auto', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Bespoke Screen Hardware Cards Grid (Stitch Design, WITHOUT Temp/RAM/Storage) */
        <div className="screens-cards-grid">
          {filteredScreens.map((screen) => {
            const isOnline = screen.status === 'ONLINE' || screen.status === 'ACTIVE';
            const campaign = getScreenCampaign(screen.id);

            return (
              <div key={screen.id} className="stitch-screen-card">
                {/* 16:9 Aspect Ratio Display Preview Container */}
                <div className="stitch-preview-container">
                  {/* Aspect Screen Background Graphic */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: isOnline
                      ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
                      : 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isOnline ? (
                      <Monitor size={36} color="#38BDF8" style={{ opacity: 0.6 }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: '#EF4444' }}>
                        <WifiOff size={28} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          Signal Timeout
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gradient Shadow Overlays */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, transparent 50%, rgba(0, 0, 0, 0.35) 100%)',
                    pointerEvents: 'none'
                  }}></div>

                  {/* Top Overlay Badges */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    right: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 2
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: isOnline ? 'rgba(255, 255, 255, 0.95)' : '#DC2626',
                      color: isOnline ? '#15803D' : '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)'
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isOnline ? '#16A34A' : '#FFFFFF',
                        display: 'inline-block'
                      }}></span>
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>

                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#F8FAFC',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      fontFamily: 'monospace'
                    }}>
                      1080p Ultra • 16:9
                    </span>
                  </div>

                  {/* Live Content Playing Watermark (Bottom Overlay) */}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    zIndex: 2,
                    color: '#FFFFFF'
                  }}>
                    <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: '#94A3B8',
                        display: 'block'
                      }}>
                        Active Feed
                      </span>
                      <p style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {campaign ? campaign.name : (isOnline ? 'Default Standby Loop' : 'Offline Cache Mode')}
                      </p>
                    </div>
                    <span style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(4px)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      flexShrink: 0
                    }}>
                      {campaign ? 'Broadcasting' : 'Standby'}
                    </span>
                  </div>
                </div>

                {/* Card Details & Metadata Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Title, Location & Menu */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                        {screen.name}
                      </h3>
                      <p style={{
                        fontSize: '0.82rem',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        marginTop: '0.35rem',
                        margin: 0
                      }}>
                        <MapPin size={13} style={{ color: '#94A3B8' }} />
                        <span>{screen.location || 'Location Not Specified'}</span>
                      </p>
                    </div>

                    {/* Options Menu */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === screen.id ? null : screen.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '6px'
                        }}
                        title="Screen options"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeMenuId === screen.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '0.35rem',
                          zIndex: 20,
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                          minWidth: '150px'
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAssignGroup(screen); }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              background: 'none',
                              border: 'none',
                              color: '#0F172A',
                              cursor: 'pointer',
                              padding: '0.5rem 0.65rem',
                              borderRadius: '6px',
                              textAlign: 'left',
                              fontSize: '0.82rem',
                              fontWeight: 500
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#EFF6FF'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Tag size={14} color="#2563EB" />
                            <span>{screen.groupName ? 'Change Group' : 'Assign to Group'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network / Hardware Metadata Strip */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    color: '#64748B',
                    marginBottom: '1rem',
                    border: '1px solid #F1F5F9'
                  }}>
                    <div>
                      <span style={{ color: '#94A3B8', textTransform: 'uppercase' }}>PAIRING:</span>{' '}
                      <strong style={{ color: '#0F172A' }}>{screen.pairingCode}</strong>
                    </div>
                    <div>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: screen.groupName ? '#EFF6FF' : '#F1F5F9',
                        color: screen.groupName ? '#2563EB' : '#64748B',
                        fontWeight: 600
                      }}>
                        {screen.groupName ? `🏷️ ${screen.groupName}` : 'Ungrouped'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions (Main actions only: NO temp, storage, ram) */}
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
                    <button
                      onClick={() => handleAssignGroup(screen)}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.75rem',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        color: '#2563EB',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#DBEAFE'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#EFF6FF'}
                    >
                      <Tag size={14} />
                      <span>{screen.groupName ? 'Edit Group' : 'Assign Group'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem 1.5rem' }}>
          <table className="fleet-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '28%' }}>SCREEN NAME</th>
                <th style={{ width: '22%' }}>LOCATION</th>
                <th style={{ width: '18%' }}>GROUP / ZONE</th>
                <th style={{ width: '14%' }}>PAIRING CODE</th>
                <th style={{ width: '10%' }}>STATUS</th>
                <th style={{ width: '8%', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredScreens.map((screen) => {
                const isOnline = screen.status === 'ONLINE' || screen.status === 'ACTIVE';
                return (
                  <tr key={screen.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '32px',
                          height: '24px',
                          borderRadius: '4px',
                          background: isOnline ? '#0F172A' : '#FEE2E2',
                          color: isOnline ? '#38BDF8' : '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isOnline ? <Monitor size={14} /> : <WifiOff size={14} />}
                        </div>
                        <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>{screen.name}</strong>
                      </div>
                    </td>
                    <td style={{ color: '#64748B' }}>
                      {screen.location || 'Not Specified'}
                    </td>
                    <td>
                      {screen.groupName ? (
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: '#EFF6FF',
                          color: '#2563EB',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}>
                          🏷️ {screen.groupName}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>Ungrouped</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                      {screen.pairingCode}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isOnline ? '#DCFCE7' : '#FEE2E2',
                        color: isOnline ? '#15803D' : '#DC2626'
                      }}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleAssignGroup(screen)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        Group
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
