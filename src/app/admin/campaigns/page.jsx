'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone,
  Play,
  Calendar,
  CheckCircle2,
  Search,
  RotateCw,
  Layers,
  Tv,
  MoreVertical,
  Edit2,
  Trash2,
  Clock,
  Plus,
  X,
  PieChart as PieIcon,
  ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state
  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [selectedScreenIds, setSelectedScreenIds] = useState([]);

  // Split-Screen / Sync Mode Form State
  const [layoutMode, setLayoutMode] = useState('SINGLE'); // 'SINGLE' or 'MULTIPLE'
  const [splitRows, setSplitRows] = useState(1);
  const [splitCols, setSplitCols] = useState(2);
  const [zonePlaylists, setZonePlaylists] = useState({});

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [campRes, screenRes, playlistRes] = await Promise.allSettled([
        client.get('/campaigns'),
        client.get('/admin/screens'),
        client.get('/playlists')
      ]);

      if (campRes.status === 'fulfilled' && Array.isArray(campRes.value?.data)) {
        setCampaigns(campRes.value.data);
      }
      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (playlistRes.status === 'fulfilled' && Array.isArray(playlistRes.value?.data)) {
        setPlaylists(playlistRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching campaign data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Screen Groups Map for builder
  const groupedScreensMap = useMemo(() => {
    return screens.reduce((acc, s) => {
      const grp = s.groupName?.trim();
      if (grp) {
        if (!acc[grp]) acc[grp] = [];
        acc[grp].push(s);
      }
      return acc;
    }, {});
  }, [screens]);

  const groupNames = Object.keys(groupedScreensMap);
  const ungroupedScreens = screens.filter(s => !s.groupName || !s.groupName.trim());

  const toggleScreenSelection = (id) => {
    if (selectedScreenIds.includes(id)) {
      setSelectedScreenIds(selectedScreenIds.filter(sId => sId !== id));
    } else {
      setSelectedScreenIds([...selectedScreenIds, id]);
    }
  };

  const toggleGroupSelection = (groupName) => {
    const groupScreens = groupedScreensMap[groupName] || [];
    const groupIds = groupScreens.map(s => s.id);
    const allSelected = groupIds.length > 0 && groupIds.every(id => selectedScreenIds.includes(id));
    if (allSelected) {
      setSelectedScreenIds(selectedScreenIds.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedScreenIds(Array.from(new Set([...selectedScreenIds, ...groupIds])));
    }
  };

  const handleZonePlaylistChange = (zoneIndex, playlistId) => {
    setZonePlaylists(prev => ({
      ...prev,
      [zoneIndex]: playlistId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isMulti = layoutMode === 'MULTIPLE';

    if (!campaignName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campaign Name Required', text: 'Please enter a name for the campaign.' });
      return;
    }
    if (!startDate || !endDate) {
      Swal.fire({ icon: 'warning', title: 'Schedule Dates Required', text: 'Please select both start and end dates.' });
      return;
    }
    if (selectedScreenIds.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Select Target Screens', text: 'Please select at least one screen or screen group to broadcast this campaign.' });
      return;
    }
    if (!isMulti && !selectedPlaylistId) {
      Swal.fire({ icon: 'warning', title: 'Select Playlist', text: 'Please select a playlist for single screen playback.' });
      return;
    }

    if (isMulti) {
      for (let r = 0; r < splitRows; r++) {
        for (let c = 0; c < splitCols; c++) {
          const zIdx = r * splitCols + c;
          if (!zonePlaylists[zIdx]) {
            Swal.fire({
              icon: 'warning',
              title: 'Assign All Zones',
              text: `Zone ${zIdx + 1} (Row ${r + 1}, Col ${c + 1}) has no playlist assigned. Please assign a playlist to every zone.`
            });
            return;
          }
        }
      }
    }

    const zonesArray = [];
    if (isMulti) {
      for (let r = 0; r < splitRows; r++) {
        for (let c = 0; c < splitCols; c++) {
          const zIdx = r * splitCols + c;
          const pId = zonePlaylists[zIdx];
          zonesArray.push({
            zoneIndex: zIdx,
            row: r,
            col: c,
            playlistId: Number(pId)
          });
        }
      }
    }
    
    setSaving(true);
    try {
      await client.post('/campaigns', {
        name: campaignName,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        layoutType: isMulti ? 'SPLIT' : 'SINGLE',
        splitRows: isMulti ? splitRows : 1,
        splitCols: isMulti ? splitCols : 1,
        playlistId: isMulti ? null : Number(selectedPlaylistId),
        zones: isMulti ? zonesArray : null,
        targetScreenIds: selectedScreenIds
      });

      Swal.fire({
        icon: 'success',
        title: 'Campaign Created!',
        text: isMulti ? `Split-Screen (${splitRows}x${splitCols}) broadcasted successfully.` : 'Successfully pushed to screens.',
        timer: 1500,
        showConfirmButton: false
      });
      setShowBuilder(false);
      
      // Reset Form
      setCampaignName('');
      setStartDate('');
      setEndDate('');
      setSelectedPlaylistId('');
      setSelectedScreenIds([]);
      setLayoutMode('SINGLE');
      setSplitRows(1);
      setSplitCols(2);
      setZonePlaylists({});
      
      fetchData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: err.response?.data?.error || 'Failed to create campaign'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (campaign) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Edit Campaign Name',
      input: 'text',
      inputValue: campaign.name,
      showCancelButton: true,
      confirmButtonText: 'Save',
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#9ca3af',
      inputValidator: (value) => {
        if (!value) return 'You need to write something!';
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.put(`/campaigns/${campaign.id}`, { name: result.value });
          setCampaigns(campaigns.map(c => c.id === campaign.id ? { ...c, name: result.value } : c));
          Swal.fire({ icon: 'success', title: 'Saved!', text: 'Campaign name updated successfully.', timer: 1500, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Update Failed', text: err.response?.data?.error || 'Failed to update campaign name' });
        }
      }
    });
  };

  const handleDeleteClick = (campaign) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Delete Campaign?',
      text: `Are you sure you want to stop and delete "${campaign.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.delete(`/campaigns/${campaign.id}`);
          setCampaigns(campaigns.filter(c => c.id !== campaign.id));
          Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Campaign removed and stopped.', timer: 1500, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.response?.data?.error || 'Failed to delete campaign' });
        }
      }
    });
  };

  // Dynamic statistics
  const stats = useMemo(() => {
    const now = new Date();
    const total = campaigns.length;
    const active = campaigns.filter(c => {
      const s = new Date(c.startDate);
      const e = new Date(c.endDate);
      return now >= s && now <= e;
    });
    const upcoming = campaigns.filter(c => now < new Date(c.startDate));
    const completed = campaigns.filter(c => now > new Date(c.endDate));

    // Calculate unique displays actively served
    const activeDisplays = new Set();
    active.forEach(c => {
      if (Array.isArray(c.targetScreens)) {
        c.targetScreens.forEach(s => activeDisplays.add(s.id));
      }
    });

    return {
      total,
      activeCount: active.length,
      upcomingCount: upcoming.length,
      completedCount: completed.length,
      activeDisplaysCount: activeDisplays.size
    };
  }, [campaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    const now = new Date();
    return campaigns.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesPlaylist = c.playlist?.name?.toLowerCase().includes(q);
        const matchesScreens = c.targetScreens?.some(s => s.name?.toLowerCase().includes(q));
        if (!matchesName && !matchesPlaylist && !matchesScreens) return false;
      }

      const s = new Date(c.startDate);
      const e = new Date(c.endDate);
      const isLive = now >= s && now <= e;
      const isUpcoming = now < s;
      const isCompleted = now > e;

      if (statusFilter === 'ACTIVE' && !isLive) return false;
      if (statusFilter === 'UPCOMING' && !isUpcoming) return false;
      if (statusFilter === 'COMPLETED' && !isCompleted) return false;

      return true;
    });
  }, [campaigns, searchQuery, statusFilter]);

  // Chronological upcoming timeline derived from real campaign dates
  const upcomingTimeline = useMemo(() => {
    const now = new Date();
    return campaigns
      .filter(c => new Date(c.endDate) >= now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 4);
  }, [campaigns]);

  const currentNow = new Date();

  return (
    <>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Campaigns</h1>
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
              {stats.activeCount} Active Schedules
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Create, schedule, target, and monitor multi-display broadcast campaigns across your signage fleet.
          </p>
        </div>

        <div className="master-header-actions">
          {!showBuilder ? (
            <button
              className="master-btn-primary"
              onClick={() => setShowBuilder(true)}
            >
              <Plus size={16} />
              <span>Create New Campaign</span>
            </button>
          ) : (
            <button
              className="master-btn-secondary"
              onClick={() => setShowBuilder(false)}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {showBuilder ? (
        /* Campaign Creator Builder Form */
        <form className="glass-panel" style={{ maxWidth: '850px', margin: '0 auto' }} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Launch New Campaign
            </h2>
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="input-group">
            <label className="input-label">Campaign Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Summer Mega Promo 2026" 
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              required
            />
          </div>

          {/* Layout Mode Selection */}
          <div className="input-group">
            <label className="input-label">Layout / Playback Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                type="button"
                onClick={() => setLayoutMode('SINGLE')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: layoutMode === 'SINGLE' ? '2px solid var(--accent-color)' : '1px solid #e2e8f0',
                  background: layoutMode === 'SINGLE' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: layoutMode === 'SINGLE' ? 'var(--accent-color)' : '#0F172A' }}>
                  <Tv size={18} />
                  <span>Single Screen</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                  Play 1 fullscreen playlist across selected displays.
                </div>
              </button>

              <button 
                type="button"
                onClick={() => setLayoutMode('MULTIPLE')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: layoutMode === 'MULTIPLE' ? '2px solid var(--accent-color)' : '1px solid #e2e8f0',
                  background: layoutMode === 'MULTIPLE' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: layoutMode === 'MULTIPLE' ? 'var(--accent-color)' : '#0F172A' }}>
                  <Layers size={18} />
                  <span>Split-Screen Mode</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                  Divide screens into grid zones playing concurrent media.
                </div>
              </button>
            </div>
          </div>

          {layoutMode === 'SINGLE' ? (
            <div className="input-group">
              <label className="input-label">Select Playlist</label>
              <select 
                className="input-field" 
                value={selectedPlaylistId} 
                onChange={e => setSelectedPlaylistId(e.target.value)}
                required
              >
                <option value="">-- Choose a playlist --</option>
                {playlists.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="input-group" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label className="input-label" style={{ fontWeight: 600, color: '#0F172A' }}>Split-Screen Grid Layout</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748B' }}>Rows</label>
                  <select className="input-field" value={splitRows} onChange={e => setSplitRows(Number(e.target.value))}>
                    <option value={1}>1 Row</option>
                    <option value={2}>2 Rows</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748B' }}>Columns</label>
                  <select className="input-field" value={splitCols} onChange={e => setSplitCols(Number(e.target.value))}>
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
                Assign Playlist to Each Zone:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${splitCols}, 1fr)`, gap: '0.75rem' }}>
                {Array.from({ length: splitRows * splitCols }).map((_, zIdx) => (
                  <div key={zIdx} style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--accent-color)' }}>
                      Zone {zIdx + 1}
                    </div>
                    <select
                      className="input-field"
                      style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      value={zonePlaylists[zIdx] || ''}
                      onChange={e => handleZonePlaylistChange(zIdx, e.target.value)}
                      required
                    >
                      <option value="">-- Playlist --</option>
                      {playlists.map(pl => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Start Date & Time</label>
              <input 
                type="datetime-local" 
                className="input-field" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">End Date & Time</label>
              <input 
                type="datetime-local" 
                className="input-field" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Screen Selection */}
          <div className="input-group">
            <label className="input-label">Target Displays / Groups</label>
            {screens.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No screens available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#F8FAFC' }}>
                {groupNames.map(grp => {
                  const grpScreens = groupedScreensMap[grp] || [];
                  const grpIds = grpScreens.map(s => s.id);
                  const isAllSel = grpIds.length > 0 && grpIds.every(id => selectedScreenIds.includes(id));
                  return (
                    <div key={grp} style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                          <input type="checkbox" checked={isAllSel} onChange={() => toggleGroupSelection(grp)} />
                          <span>🏷️ {grp}</span>
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{grpScreens.length} screens</span>
                      </div>
                      <div style={{ paddingLeft: '1.5rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {grpScreens.map(s => (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', color: '#475569' }}>
                            <input type="checkbox" checked={selectedScreenIds.includes(s.id)} onChange={() => toggleScreenSelection(s.id)} />
                            <span>{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {ungroupedScreens.length > 0 && (
                  <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>Individual Displays</div>
                    {ungroupedScreens.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', color: '#475569', marginBottom: '0.25rem' }}>
                        <input type="checkbox" checked={selectedScreenIds.includes(s.id)} onChange={() => toggleScreenSelection(s.id)} />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving || !campaignName || !startDate || !endDate || selectedScreenIds.length === 0}
            style={{ marginTop: '1rem' }}
          >
            {saving ? 'Launching...' : 'Launch Campaign'}
          </button>
        </form>
      ) : (
        /* Main Campaigns Dashboard View */
        <>
          {/* Top 4 Stats Cards (Stitch Design) */}
          <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
            {/* Stat 1: Total Campaigns */}
            <div className="screen-stat-card" onClick={() => setStatusFilter('ALL')} style={{ cursor: 'pointer' }}>
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
                  <Megaphone size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Campaigns
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{stats.total}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>All scheduled</span>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>Fleet 100%</span>
            </div>

            {/* Stat 2: Active Broadcasting */}
            <div
              className="screen-stat-card"
              onClick={() => setStatusFilter('ACTIVE')}
              style={{ cursor: 'pointer', borderColor: statusFilter === 'ACTIVE' ? '#10B981' : undefined }}
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
                  <Play size={18} fill="#059669" />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Broadcasting
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{stats.activeCount}</span>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>● LIVE</span>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {stats.activeDisplaysCount} screens
              </span>
            </div>

            {/* Stat 3: Scheduled & Upcoming */}
            <div
              className="screen-stat-card"
              onClick={() => setStatusFilter('UPCOMING')}
              style={{ cursor: 'pointer', borderColor: statusFilter === 'UPCOMING' ? '#F59E0B' : undefined }}
            >
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
                  <Calendar size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scheduled
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706' }}>{stats.upcomingCount}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Upcoming loops</span>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D97706' }}>Queued</span>
            </div>

            {/* Stat 4: Paused / Completed */}
            <div
              className="screen-stat-card"
              onClick={() => setStatusFilter('COMPLETED')}
              style={{ cursor: 'pointer', borderColor: statusFilter === 'COMPLETED' ? '#94A3B8' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Completed / Past
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#475569' }}>{stats.completedCount}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Archived</span>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Past</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="screens-toolbar">
            <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search campaigns, playlists, targeted screens..."
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
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
                <option value="ALL">All Statuses ({campaigns.length})</option>
                <option value="ACTIVE">Active Only ({stats.activeCount})</option>
                <option value="UPCOMING">Upcoming Only ({stats.upcomingCount})</option>
                <option value="COMPLETED">Completed ({stats.completedCount})</option>
              </select>
            </div>
          </div>

          {/* Two-Column Campaign Content Layout */}
          <div className="campaigns-two-col-layout">
            {/* Left Column: Campaigns Feed */}
            <div>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#64748B' }}>
                  <RotateCw size={24} className="spin-icon" style={{ marginRight: '0.5rem' }} />
                  <span>Loading campaigns...</span>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
                  <Megaphone size={40} style={{ color: '#94A3B8', marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {campaigns.length === 0 ? 'No campaigns running yet' : 'No campaigns match your filter'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '380px', margin: '0.35rem auto 1.25rem' }}>
                    {campaigns.length === 0
                      ? 'Launch your first DOOH campaign to broadcast playlists across your fleet.'
                      : 'Try resetting your search query or status filter.'}
                  </p>
                  {campaigns.length === 0 ? (
                    <button
                      className="btn-primary"
                      onClick={() => setShowBuilder(true)}
                      style={{ width: 'auto', display: 'inline-flex', padding: '0.5rem 1.25rem' }}
                    >
                      + Create Campaign
                    </button>
                  ) : (
                    <button
                      className="btn-secondary"
                      onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                      style={{ width: 'auto', display: 'inline-flex', padding: '0.4rem 1rem' }}
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              ) : (
                filteredCampaigns.map((camp) => {
                  const s = new Date(camp.startDate);
                  const e = new Date(camp.endDate);
                  const isLive = currentNow >= s && currentNow <= e;
                  const isUpcoming = currentNow < s;
                  const isCompleted = currentNow > e;

                  // Target screens details
                  const targetList = Array.isArray(camp.targetScreens) ? camp.targetScreens : [];
                  const onlineCount = targetList.filter(ts => {
                    const sc = screens.find(scr => scr.id === ts.id);
                    return sc && (sc.status === 'ONLINE' || sc.status === 'ACTIVE');
                  }).length;

                  return (
                    <div
                      key={camp.id}
                      className="campaign-rich-card"
                      style={{
                        borderLeft: isLive ? '4px solid #10B981' : (isUpcoming ? '4px solid #2563EB' : '4px solid #94A3B8')
                      }}
                    >
                      <div style={{ padding: '1.25rem' }}>
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: isLive ? '#ECFDF5' : '#EFF6FF',
                              color: isLive ? '#059669' : '#2563EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {camp.layoutType === 'SPLIT' ? <Layers size={18} /> : <Tv size={18} />}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                  {camp.name}
                                </h3>

                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '9999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: isLive ? '#DCFCE7' : (isUpcoming ? '#DBEAFE' : '#F1F5F9'),
                                  color: isLive ? '#15803D' : (isUpcoming ? '#1D4ED8' : '#64748B')
                                }}>
                                  <span style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    background: isLive ? '#16A34A' : (isUpcoming ? '#2563EB' : '#94A3B8')
                                  }}></span>
                                  {isLive ? 'ACTIVE' : (isUpcoming ? 'SCHEDULED' : 'COMPLETED')}
                                </span>

                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  background: camp.layoutType === 'SPLIT' ? '#EFF6FF' : '#F8FAFC',
                                  color: camp.layoutType === 'SPLIT' ? '#2563EB' : '#64748B',
                                  border: '1px solid #E2E8F0'
                                }}>
                                  {camp.layoutType === 'SPLIT' ? `Split (${camp.splitRows}x${camp.splitCols})` : 'Single Screen'}
                                </span>
                              </div>

                              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                                {camp.layoutType === 'SPLIT'
                                  ? `${camp.splitRows * camp.splitCols} Concurrent Zone Channels`
                                  : (camp.playlist?.name ? `Playlist: ${camp.playlist.name}` : 'Default Playlist Assigned')}
                              </p>
                            </div>
                          </div>

                          {/* Options Menu */}
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === camp.id ? null : camp.id); }}
                              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
                              title="Campaign Options"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {activeMenuId === camp.id && (
                              <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '0.35rem',
                                zIndex: 10,
                                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                                minWidth: '130px'
                              }}>
                                <button
                                  onClick={() => handleEditClick(camp)}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: 'none',
                                    border: 'none',
                                    color: '#0F172A',
                                    cursor: 'pointer',
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                  <Edit2 size={14} color="#2563EB" />
                                  <span>Edit Name</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(camp)}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: 'none',
                                    border: 'none',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                  <Trash2 size={14} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metadata Details Grid (Real Data: Fleet, Schedule, Media) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '0.75rem',
                          background: '#F8FAFC',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid #F1F5F9',
                          marginBottom: '0.85rem'
                        }}>
                          <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                              TARGET FLEET
                            </span>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '0.1rem' }}>
                              {targetList.length} Displays
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {targetList.map(t => t.name).join(', ') || 'All fleet'}
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                              MEDIA / ZONES
                            </span>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '0.1rem' }}>
                              {camp.layoutType === 'SPLIT' ? `${camp.splitRows * camp.splitCols} Channels` : 'Single Loop'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {camp.playlist?.name || 'Assigned'}
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                              SCHEDULE WINDOW
                            </span>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '0.1rem' }}>
                              {s.toLocaleDateString([], { month: 'short', day: 'numeric' })} &mdash; {e.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &mdash; {e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                              FLEET STATUS
                            </span>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: onlineCount > 0 ? '#059669' : '#DC2626', marginTop: '0.1rem' }}>
                              {onlineCount}/{targetList.length} Online
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {onlineCount === targetList.length && targetList.length > 0 ? 'Full coverage' : 'Partial / offline'}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></span>
                            {targetList.length} targeted fleet nodes synced
                          </span>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                              onClick={() => handleEditClick(camp)}
                              style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Edit Name
                            </button>
                            <button
                              onClick={() => handleDeleteClick(camp)}
                              style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Fleet Allocation & Schedule Timeline */}
            <div>
              {/* Card 1: Fleet Airtime Allocation */}
              <div className="telemetry-card">
                <div className="telemetry-card-header" style={{ marginBottom: '0.85rem' }}>
                  <div className="telemetry-card-title">
                    <PieIcon size={17} />
                    <span>Airtime Allocation</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Active Fleet</span>
                </div>

                {/* Segmented Color Bar */}
                <div style={{
                  height: '8px',
                  borderRadius: '9999px',
                  background: '#F1F5F9',
                  overflow: 'hidden',
                  display: 'flex',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: `${stats.total > 0 ? (stats.activeCount / stats.total) * 100 : 0}%`,
                    background: '#10B981',
                    transition: 'width 0.4s'
                  }}></div>
                  <div style={{
                    width: `${stats.total > 0 ? (stats.upcomingCount / stats.total) * 100 : 0}%`,
                    background: '#2563EB',
                    transition: 'width 0.4s'
                  }}></div>
                  <div style={{
                    width: `${stats.total > 0 ? (stats.completedCount / stats.total) * 100 : 0}%`,
                    background: '#94A3B8',
                    transition: 'width 0.4s'
                  }}></div>
                </div>

                {/* Allocation Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#10B981' }}></span>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>Active Campaigns</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      {stats.activeCount} ({stats.total > 0 ? Math.round((stats.activeCount / stats.total) * 100) : 0}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#2563EB' }}></span>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>Scheduled / Upcoming</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      {stats.upcomingCount} ({stats.total > 0 ? Math.round((stats.upcomingCount / stats.total) * 100) : 0}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#94A3B8' }}></span>
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>Completed / Archived</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>
                      {stats.completedCount} ({stats.total > 0 ? Math.round((stats.completedCount / stats.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Upcoming Schedule Shifts (Derived dynamically from real campaigns) */}
              <div className="telemetry-card">
                <div className="telemetry-card-header" style={{ marginBottom: '0.85rem' }}>
                  <div className="telemetry-card-title">
                    <Clock size={17} />
                    <span>Schedule Transitions</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Timeline</span>
                </div>

                {upcomingTimeline.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#64748B' }}>
                    <Clock size={24} style={{ color: '#94A3B8', marginBottom: '0.35rem' }} />
                    <p style={{ fontSize: '0.82rem', margin: 0 }}>No future transitions scheduled</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1rem' }}>
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      bottom: '8px',
                      left: '3px',
                      width: '2px',
                      background: '#E2E8F0'
                    }}></div>

                    {upcomingTimeline.map(c => {
                      const s = new Date(c.startDate);
                      const isNowLive = currentNow >= s && currentNow <= new Date(c.endDate);
                      return (
                        <div key={c.id} style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute',
                            left: '-1.25rem',
                            top: '3px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isNowLive ? '#10B981' : '#2563EB',
                            border: '1px solid #FFFFFF'
                          }}></span>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isNowLive ? '#059669' : '#2563EB' }}>
                            {s.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isNowLive && ' (LIVE)'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', marginTop: '0.1rem' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {c.targetScreens?.length || 0} Displays • {c.playlist?.name || 'Playlist'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: Broadcast Feeds Status */}
              <div className="telemetry-card" style={{ background: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={18} color="#2563EB" />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>Broadcast Feeds Status</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                  Active campaigns are streaming automatically to paired Android TV screens via WebSocket push triggers.
                </p>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Fleet Nodes</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>{screens.length} Registered</span>
                </div>
              </div>
            </div>
          </div>
        </>
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
