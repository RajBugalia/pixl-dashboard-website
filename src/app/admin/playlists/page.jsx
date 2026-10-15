'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ListMusic,
  Plus,
  Search,
  Trash2,
  Edit2,
  Film,
  Image as ImageIcon,
  Tv,
  Layers,
  RotateCw,
  Eye,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  LayoutList,
  Grid,
  MoreVertical,
  X,
  Play,
  ArrowUpRight,
  SlidersHorizontal,
  Clock,
  Sparkles
} from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import client from '@/api/client';
import MetricCard from '@/components/MetricCard';

export default function AdminPlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [media, setMedia] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Selected Playlist for Right-side Inspector Preview
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  // Current media index playing inside Inspector Preview
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);

  // View & Filter states
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'POPULATED' | 'EMPTY'
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Create Playlist Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [modalSelectedMediaIds, setModalSelectedMediaIds] = useState([]);
  const [modalMediaDurations, setModalMediaDurations] = useState({});
  const [batchDurationInput, setBatchDurationInput] = useState(10);
  const [modalMediaSearch, setModalMediaSearch] = useState('');
  const [modalMediaTypeFilter, setModalMediaTypeFilter] = useState('ALL'); // 'ALL' | 'IMAGE' | 'VIDEO'
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  // Close card menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  // Load all necessary real data
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [playlistRes, mediaRes, campaignRes, screenRes] = await Promise.allSettled([
        client.get('/playlists'),
        client.get('/media'),
        client.get('/campaigns'),
        client.get('/admin/screens')
      ]);

      if (playlistRes.status === 'fulfilled' && Array.isArray(playlistRes.value?.data)) {
        const fetchedPlaylists = playlistRes.value.data;
        setPlaylists(fetchedPlaylists);
        setSelectedPlaylistId(prev => {
          if (fetchedPlaylists.length > 0) {
            if (!prev || !fetchedPlaylists.some(p => p.id === prev)) {
              return fetchedPlaylists[0].id;
            }
            return prev;
          }
          return null;
        });
      }
      if (mediaRes.status === 'fulfilled' && Array.isArray(mediaRes.value?.data)) {
        setMedia(mediaRes.value.data);
      }
      if (campaignRes.status === 'fulfilled' && Array.isArray(campaignRes.value?.data)) {
        setCampaigns(campaignRes.value.data);
      }
      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching playlist dependencies:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Currently inspected playlist
  const inspectedPlaylist = useMemo(() => {
    return playlists.find(p => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  // Real Dynamic Telemetry Metrics (Strictly NO temp, storage, ram, NO demo data)
  const metrics = useMemo(() => {
    const totalPlaylists = playlists.length;
    const populated = playlists.filter(p => (p.media?.length || p.mediaCount || 0) > 0).length;
    const empty = totalPlaylists - populated;

    // Total media items across playlists
    const totalSequencedMedia = playlists.reduce((acc, p) => acc + (p.media?.length || p.mediaCount || 0), 0);
    const avgMediaPerPlaylist = totalPlaylists > 0 ? (totalSequencedMedia / totalPlaylists).toFixed(1) : '0';

    // Campaigns currently utilizing playlists
    const activeCampaignsLinked = campaigns.filter(c => {
      return playlists.some(p => {
        if (c.playlistId === p.id || c.playlist?.id === p.id) return true;
        if (c.zoneConfigJson && typeof c.zoneConfigJson === 'string' && c.zoneConfigJson.includes(`"playlistId":${p.id}`)) return true;
        return false;
      });
    });

    // Unique physical screens linked to campaigns with playlists
    const assignedScreenIds = new Set();
    activeCampaignsLinked.forEach(c => {
      if (Array.isArray(c.targetScreens)) {
        c.targetScreens.forEach(s => assignedScreenIds.add(s.id || s));
      } else if (Array.isArray(c.targetScreenIds)) {
        c.targetScreenIds.forEach(id => assignedScreenIds.add(id));
      }
    });

    // Media library count
    const totalLibraryAssets = media.length;
    const videoCount = media.filter(m => m.type === 'VIDEO').length;
    const imageCount = media.filter(m => m.type === 'IMAGE').length;

    return {
      totalPlaylists,
      populated,
      empty,
      totalSequencedMedia,
      avgMediaPerPlaylist,
      activeCampaignsCount: activeCampaignsLinked.length,
      assignedScreensCount: assignedScreenIds.size,
      totalLibraryAssets,
      videoCount,
      imageCount
    };
  }, [playlists, campaigns, media]);

  // Map campaigns per playlist for badges
  const playlistCampaignMap = useMemo(() => {
    const map = {};
    playlists.forEach(p => {
      map[p.id] = campaigns.filter(c => {
        if (c.playlistId === p.id || c.playlist?.id === p.id) return true;
        if (c.zoneConfigJson && typeof c.zoneConfigJson === 'string' && c.zoneConfigJson.includes(`"playlistId":${p.id}`)) return true;
        return false;
      });
    });
    return map;
  }, [playlists, campaigns]);

  // Filtered Playlists
  const filteredPlaylists = useMemo(() => {
    return playlists.filter(playlist => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = playlist.name?.toLowerCase().includes(q);
        const matchesMedia = playlist.media?.some(m => m.filename?.toLowerCase().includes(q));
        if (!matchesName && !matchesMedia) return false;
      }

      // Status filter
      const mediaCount = playlist.media?.length || playlist.mediaCount || 0;
      if (statusFilter === 'POPULATED' && mediaCount === 0) return false;
      if (statusFilter === 'EMPTY' && mediaCount > 0) return false;

      return true;
    });
  }, [playlists, searchQuery, statusFilter]);

  // Rename playlist
  const handleEditClick = (playlist) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Rename Playlist Sequence',
      input: 'text',
      inputValue: playlist.name,
      showCancelButton: true,
      confirmButtonText: 'Save Name',
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#9ca3af',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Playlist name cannot be empty.';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: 'Updating Sequence...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          await client.put(`/playlists/${playlist.id}`, { name: result.value.trim() });
          setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, name: result.value.trim() } : p));

          Swal.fire({
            icon: 'success',
            title: 'Renamed Successfully',
            text: `Playlist updated to "${result.value.trim()}".`,
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.response?.data?.error || 'Failed to update playlist name'
          });
        }
      }
    });
  };

  // Delete playlist with warning
  const handleDeleteClick = (playlist) => {
    setActiveMenuId(null);
    const linked = playlistCampaignMap[playlist.id] || [];
    const warningText = linked.length > 0
      ? `This will also delete ${linked.length} linked active campaign(s) running this sequence!`
      : 'This playlist will be removed permanently.';

    Swal.fire({
      title: `Delete "${playlist.name}"?`,
      text: warningText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete sequence'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: 'Deleting Sequence...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          await client.delete(`/playlists/${playlist.id}`);
          setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
          if (selectedPlaylistId === playlist.id) {
            setSelectedPlaylistId(null);
          }

          Swal.fire({
            icon: 'success',
            title: 'Sequence Deleted',
            text: 'Playlist and linked references removed.',
            timer: 1500,
            showConfirmButton: false
          });
          fetchData();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Deletion Failed',
            text: 'Could not delete playlist.'
          });
        }
      }
    });
  };

  // Modal: Toggle Media selection with duration initialization
  const toggleModalMedia = (id) => {
    setModalSelectedMediaIds(prev => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter(mId => mId !== id);
      } else {
        const item = media.find(m => m.id === id);
        const defaultDur = item?.durationSeconds || (item?.type === 'IMAGE' ? 10 : 15);
        setModalMediaDurations(d => ({ ...d, [id]: d[id] || defaultDur }));
        return [...prev, id];
      }
    });
  };

  // Batch set duration across all selected images
  const applyBatchDuration = (secs) => {
    const num = Math.max(1, parseInt(secs, 10) || 10);
    setBatchDurationInput(num);
    setModalMediaDurations(prev => {
      const updated = { ...prev };
      modalSelectedMediaIds.forEach(id => {
        const item = media.find(m => m.id === id);
        if (item?.type === 'IMAGE') {
          updated[id] = num;
        }
      });
      return updated;
    });
  };

  // Adjust duration for a single media item
  const updateSingleDuration = (id, newDuration) => {
    const num = Math.max(1, parseInt(newDuration, 10) || 1);
    setModalMediaDurations(prev => ({ ...prev, [id]: num }));
  };

  // Step duration (+/- delta)
  const stepSingleDuration = (id, delta) => {
    setModalMediaDurations(prev => {
      const current = prev[id] || 10;
      return { ...prev, [id]: Math.max(1, current + delta) };
    });
  };

  // Total selected loop duration in seconds
  const totalSelectedDuration = useMemo(() => {
    return modalSelectedMediaIds.reduce((acc, id) => {
      const item = media.find(m => m.id === id);
      const dur = modalMediaDurations[id] || item?.durationSeconds || 10;
      return acc + dur;
    }, 0);
  }, [modalSelectedMediaIds, modalMediaDurations, media]);

  // Filtered media for Create Modal
  const modalFilteredMedia = useMemo(() => {
    return media.filter(item => {
      if (modalMediaTypeFilter !== 'ALL' && item.type !== modalMediaTypeFilter) return false;
      if (modalMediaSearch.trim()) {
        const q = modalMediaSearch.toLowerCase();
        if (!item.filename?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [media, modalMediaTypeFilter, modalMediaSearch]);

  // Handle Create Playlist Submission
  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Name Required', text: 'Please enter a name for the playlist.' });
      return;
    }
    if (modalSelectedMediaIds.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Media Selection Required', text: 'Select at least one media asset for the playlist sequence.' });
      return;
    }

    setSavingPlaylist(true);
    try {
      const res = await client.post('/playlists', {
        name: newPlaylistName.trim(),
        mediaIds: modalSelectedMediaIds,
        mediaDurations: modalMediaDurations
      });

      Swal.fire({
        icon: 'success',
        title: 'Playlist Created!',
        text: `Sequence "${newPlaylistName.trim()}" is ready with custom slide durations.`,
        timer: 1500,
        showConfirmButton: false
      });

      setShowCreateModal(false);
      setNewPlaylistName('');
      setModalSelectedMediaIds([]);
      setModalMediaDurations({});
      setModalMediaSearch('');
      await fetchData();
      if (res?.data?.id) {
        setSelectedPlaylistId(res.data.id);
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: err.response?.data?.message || 'Failed to create playlist'
      });
    } finally {
      setSavingPlaylist(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Playlists &amp; Sequences...</p>
      </div>
    );
  }

  const inspectedMediaItems = inspectedPlaylist?.media || [];
  const currentPreviewMedia = inspectedMediaItems[previewMediaIndex] || inspectedMediaItems[0] || null;
  const inspectedCampaigns = inspectedPlaylist ? (playlistCampaignMap[inspectedPlaylist.id] || []) : [];

  return (
    <>
      {/* 1. Header & Operational Matrix Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HQ OPERATIONAL MATRIX • SEQUENCE ARCHITECTURE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Playlists</h1>
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
              {metrics.totalPlaylists} Active Sequences
            </span>
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
              {metrics.totalSequencedMedia} Total Media Slots
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Build continuous media playback sequences, inspect ordered timeline blocks, and link playlists to screen campaigns.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Reload Sequences"
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
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '0.55rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <Plus size={18} />
            <span>Create New Playlist</span>
          </button>
        </div>
      </div>

      {/* 2. Four Dynamic Metric Cards */}
      <div className="master-stat-grid">
        <MetricCard
          label="Total Sequences"
          icon={ListMusic}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          value={metrics.totalPlaylists}
          status={
            <div className="metric-status-row">
              <span className="metric-status-pill online">
                <span className="metric-dot online" aria-hidden="true" />
                {metrics.populated} With Media
              </span>
              <span className="metric-status-sep" aria-hidden="true">•</span>
              <span className="metric-status-pill neutral">
                <span className="metric-dot neutral" aria-hidden="true" />
                {metrics.empty} Empty Loops
              </span>
            </div>
          }
        />

        <MetricCard
          label="Sequenced Media"
          icon={Layers}
          iconBg="#ECFDF5"
          iconColor="#059669"
          value={metrics.totalSequencedMedia}
          description={`Average ${metrics.avgMediaPerPlaylist} assets per playlist`}
        />

        <MetricCard
          label="Live Deployments"
          icon={Tv}
          iconBg="#FEF3C7"
          iconColor="#D97706"
          value={metrics.activeCampaignsCount}
          description={`Broadcasting on ${metrics.assignedScreensCount} physical displays`}
        />

        <MetricCard
          label="Library Assets Ready"
          icon={Film}
          iconBg="#F3E8FF"
          iconColor="#7E22CE"
          value={metrics.totalLibraryAssets}
          description={`${metrics.videoCount} Videos • ${metrics.imageCount} Images`}
        />
      </div>

      {/* 3. Filter, Search & View Controls Ribbon */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '450px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlist name or media title..."
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

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => setStatusFilter('ALL')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'ALL' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: statusFilter === 'ALL' ? 600 : 500,
                  fontSize: '0.8rem',
                  boxShadow: statusFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                All Sequences ({playlists.length})
              </button>
              <button
                onClick={() => setStatusFilter('POPULATED')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'POPULATED' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'POPULATED' ? '#15803D' : 'var(--text-secondary)',
                  fontWeight: statusFilter === 'POPULATED' ? 600 : 500,
                  fontSize: '0.8rem',
                  boxShadow: statusFilter === 'POPULATED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Populated ({metrics.populated})
              </button>
              <button
                onClick={() => setStatusFilter('EMPTY')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: statusFilter === 'EMPTY' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'EMPTY' ? '#B45309' : 'var(--text-secondary)',
                  fontWeight: statusFilter === 'EMPTY' ? 600 : 500,
                  fontSize: '0.8rem',
                  boxShadow: statusFilter === 'EMPTY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Empty Loops ({metrics.empty})
              </button>
            </div>

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('detailed')}
                title="Detailed Sequencer View"
                style={{
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'detailed' ? '#ffffff' : 'transparent',
                  color: viewMode === 'detailed' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  boxShadow: viewMode === 'detailed' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Compact Grid"
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

      {/* 4. Main 12-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Playlist Sequences (8 cols) */}
        <div style={{ gridColumn: 'span 12', lg: 'span 8', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }} className="col-span-12 xl:col-span-8">
          {filteredPlaylists.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <ListMusic size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Playlists Found
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                {searchQuery
                  ? `No playlist matches "${searchQuery}". Try clearing search filters.`
                  : 'Get started by creating your first sequence loop with media from your library.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                style={{ width: 'auto', margin: '0 auto', padding: '0.5rem 1.5rem' }}
              >
                + Create New Playlist
              </button>
            </div>
          ) : viewMode === 'detailed' ? (
            /* Detailed Sequencer View */
            filteredPlaylists.map(playlist => {
              const items = playlist.media || [];
              const isSelected = playlist.id === selectedPlaylistId;
              const linked = playlistCampaignMap[playlist.id] || [];

              return (
                <article
                  key={playlist.id}
                  onClick={() => {
                    setSelectedPlaylistId(playlist.id);
                    setPreviewMediaIndex(0);
                  }}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                    boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'var(--glass-shadow)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Top Bar of Playlist */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '10px',
                        background: isSelected ? '#EFF6FF' : '#F8FAFC',
                        color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #E2E8F0'
                      }}>
                        <ListMusic size={22} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {playlist.name}
                          </h2>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: 'var(--text-secondary)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em'
                          }}>
                            SEQ-{playlist.id}
                          </span>
                          {items.length > 0 ? (
                            <span style={{
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              Active Loop
                            </span>
                          ) : (
                            <span style={{
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              background: '#FEF3C7',
                              color: '#B45309',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              Empty Sequence
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <Layers size={14} style={{ color: 'var(--accent-color)' }} />
                            {items.length} Media {items.length === 1 ? 'Asset' : 'Assets'}
                          </span>
                          <span>•</span>
                          {linked.length > 0 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#1D4ED8', fontWeight: 600 }}>
                              <Tv size={14} />
                              Running in {linked.length} {linked.length === 1 ? 'Campaign' : 'Campaigns'}
                            </span>
                          ) : (
                            <span>Unassigned to Campaigns</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedPlaylistId(playlist.id);
                          setPreviewMediaIndex(0);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: isSelected ? 'var(--accent-color)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={14} />
                        <span>{isSelected ? 'Inspecting' : 'Inspect'}</span>
                      </button>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === playlist.id ? null : playlist.id)}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === playlist.id && (
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '110%',
                            background: '#ffffff',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '0.35rem',
                            zIndex: 20,
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            minWidth: '140px'
                          }}>
                            <button
                              onClick={() => handleEditClick(playlist)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                textAlign: 'left',
                                fontSize: '0.85rem'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Edit2 size={14} /> Rename
                            </button>
                            <button
                              onClick={() => handleDeleteClick(playlist)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                textAlign: 'left',
                                fontSize: '0.85rem'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Sequencer Timeline Visualizer */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Sequence Timeline Track
                      </span>
                      <span>{items.length} Slots Sequenced</span>
                    </div>

                    {items.length === 0 ? (
                      <div style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)'
                      }}>
                        No media assets attached. Create a new playlist with media to schedule playback.
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.max(items.length, 4)}, minmax(130px, 1fr))`,
                        gap: '0.5rem',
                        overflowX: 'auto',
                        paddingBottom: '0.35rem'
                      }}>
                        {items.map((m, idx) => (
                          <div
                            key={m.id || idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlaylistId(playlist.id);
                              setPreviewMediaIndex(idx);
                            }}
                            style={{
                              borderRadius: '8px',
                              background: '#F8FAFC',
                              border: isSelected && previewMediaIndex === idx ? '2px solid var(--accent-color)' : '1px solid #E2E8F0',
                              padding: '0.5rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                width: 18,
                                height: 18,
                                borderRadius: '4px',
                                background: '#E2E8F0',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                {idx + 1}
                              </span>
                              <span style={{
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: m.type === 'VIDEO' ? '#EFF6FF' : '#F5F3FF',
                                color: m.type === 'VIDEO' ? '#1D4ED8' : '#7C3AED',
                                fontSize: '0.65rem',
                                fontWeight: 700
                              }}>
                                {m.type}
                              </span>
                            </div>

                            <div style={{
                              width: '100%',
                              height: 60,
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: '#0F172A',
                              position: 'relative'
                            }}>
                              {m.type === 'IMAGE' ? (
                                <img src={m.publicUrl} alt={m.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <video src={m.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>

                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.filename}>
                              {m.filename}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            /* Compact Grid View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredPlaylists.map(playlist => {
                const items = playlist.media || [];
                const isSelected = playlist.id === selectedPlaylistId;
                const coverMedia = items[0];

                return (
                  <div
                    key={playlist.id}
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      setPreviewMediaIndex(0);
                    }}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Thumbnail Cover */}
                      <div style={{
                        width: '100%',
                        height: 130,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#0F172A',
                        marginBottom: '0.85rem',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {coverMedia ? (
                          coverMedia.type === 'IMAGE' ? (
                            <img src={coverMedia.publicUrl} alt={coverMedia.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <video src={coverMedia.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )
                        ) : (
                          <div style={{ color: '#94A3B8', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <Film size={24} />
                            <span>No Media</span>
                          </div>
                        )}
                        <span style={{
                          position: 'absolute',
                          bottom: '0.5rem',
                          right: '0.5rem',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#ffffff',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}>
                          {items.length} Assets
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                            {playlist.name}
                          </h3>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            SEQ-{playlist.id}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(playlist);
                          }}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem' }}
                          title="Delete Playlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: 600 }}>
                        {isSelected ? '● Currently Inspecting' : 'Click to Inspect'}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Quick Sequence Builder & Active Loop Inspector (4 cols) */}
        <aside style={{ gridColumn: 'span 12', lg: 'span 4', minWidth: 0 }} className="col-span-12 xl:col-span-4">
          <div className="glass-panel" style={{ padding: '1.25rem', position: 'sticky', top: '5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Inspector Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ padding: '0.35rem', borderRadius: '6px', background: '#EFF6FF', color: 'var(--accent-color)' }}>
                  <Play size={16} />
                </span>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Loop Inspector
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Simulated Broadcast Engine
                  </span>
                </div>
              </div>

              {inspectedPlaylist && (
                <span style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: '#DCFCE7',
                  color: '#15803D',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  Online
                </span>
              )}
            </div>

            {inspectedPlaylist ? (
              <>
                {/* Active Player Box */}
                <div>
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#0B0F19',
                    position: 'relative',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {currentPreviewMedia ? (
                      currentPreviewMedia.type === 'IMAGE' ? (
                        <img
                          src={currentPreviewMedia.publicUrl}
                          alt={currentPreviewMedia.filename}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <video
                          key={currentPreviewMedia.publicUrl}
                          src={currentPreviewMedia.publicUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      )
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748B', padding: '1rem' }}>
                        <Film size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                        <span style={{ fontSize: '0.85rem' }}>No media in this sequence</span>
                      </div>
                    )}

                    {/* Top Simulated Tag Overlay */}
                    {currentPreviewMedia && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#F8FAFC',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }}></span>
                        <span>LIVE LOOP • SLOT {previewMediaIndex + 1}/{inspectedMediaItems.length}</span>
                      </div>
                    )}

                    {/* Bottom Metadata Overlay */}
                    {currentPreviewMedia && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '0.5rem 0.75rem',
                        background: 'linear-gradient(to top, rgba(11, 15, 25, 0.9), transparent)',
                        color: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end'
                      }}>
                        <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentPreviewMedia.filename}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                            Format: {currentPreviewMedia.type}
                          </div>
                        </div>

                        {/* Prev/Next Scrub Buttons */}
                        {inspectedMediaItems.length > 1 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMediaIndex(prev => (prev <= 0 ? inspectedMediaItems.length - 1 : prev - 1));
                              }}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Previous Item"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMediaIndex(prev => (prev >= inspectedMediaItems.length - 1 ? 0 : prev + 1));
                              }}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Next Item"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ordered Media Blocks List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                      Ordered Media Sequence
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                      {inspectedMediaItems.length} Blocks
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {inspectedMediaItems.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, padding: '0.5rem 0' }}>
                        No items added to this sequence.
                      </p>
                    ) : (
                      inspectedMediaItems.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          onClick={() => setPreviewMediaIndex(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            background: previewMediaIndex === idx ? '#EFF6FF' : '#F8FAFC',
                            border: previewMediaIndex === idx ? '1px solid var(--accent-color)' : '1px solid #E2E8F0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                            <span style={{
                              width: 20,
                              height: 20,
                              borderRadius: '4px',
                              background: '#E2E8F0',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ overflow: 'hidden' }}>
                              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.filename}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                  {m.type}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: m.type === 'IMAGE' ? '#D97706' : '#2563EB',
                                  background: m.type === 'IMAGE' ? '#FFFBEB' : '#EFF6FF',
                                  padding: '1px 5px',
                                  borderRadius: '4px'
                                }}>
                                  {m.type === 'IMAGE' ? `${m.durationSeconds || 10}s` : 'Video Stream'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {previewMediaIndex === idx && (
                            <CheckCircle2 size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Target Campaigns & Displays */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    Active Linked Campaigns
                  </span>

                  {inspectedCampaigns.length === 0 ? (
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#F8FAFC', border: '1px dashed #E2E8F0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      This sequence is not assigned to any campaign yet.
                      <div style={{ marginTop: '0.5rem' }}>
                        <Link
                          href="/admin/campaigns"
                          style={{ color: 'var(--accent-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          Create Campaign with this Playlist <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {inspectedCampaigns.map(c => (
                        <div
                          key={c.id}
                          style={{
                            padding: '0.5rem 0.65rem',
                            borderRadius: '6px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                              {c.name}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#15803D' }}>
                              ● Broadcasting ({c.status || 'ACTIVE'})
                            </span>
                          </div>
                          <Link href="/admin/campaigns" style={{ color: 'var(--accent-color)', fontSize: '0.75rem' }}>
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Launch CTA Button */}
                <Link
                  href="/admin/campaigns"
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    fontSize: '0.88rem',
                    textDecoration: 'none'
                  }}
                >
                  <Sparkles size={16} />
                  <span>Launch in Campaign Broadcast</span>
                </Link>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <ListMusic size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.88rem', margin: 0 }}>Select any playlist sequence from the left list to inspect its loop timeline and simulated player.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 5. Create Playlist Modal Dialog */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.75rem',
            background: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Create New Sequence Playlist
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Select library assets to build an ordered continuous playback loop.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreatePlaylistSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 600 }}>Playlist Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Flagship Retail Loop 4K"
                  required
                />
              </div>

              {/* Media Selection Header & Controls */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: 600 }}>
                    Select Media Files ({modalSelectedMediaIds.length} selected)
                  </label>

                  {/* Filter tabs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F1F5F9', padding: '0.15rem', borderRadius: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setModalMediaTypeFilter('ALL')}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: modalMediaTypeFilter === 'ALL' ? '#ffffff' : 'transparent',
                        fontWeight: modalMediaTypeFilter === 'ALL' ? 600 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMediaTypeFilter('VIDEO')}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: modalMediaTypeFilter === 'VIDEO' ? '#ffffff' : 'transparent',
                        fontWeight: modalMediaTypeFilter === 'VIDEO' ? 600 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      Videos
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMediaTypeFilter('IMAGE')}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: modalMediaTypeFilter === 'IMAGE' ? '#ffffff' : 'transparent',
                        fontWeight: modalMediaTypeFilter === 'IMAGE' ? 600 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      Images
                    </button>
                  </div>
                </div>

                {/* Media Search input */}
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="input-field"
                    value={modalMediaSearch}
                    onChange={(e) => setModalMediaSearch(e.target.value)}
                    placeholder="Search media by filename..."
                    style={{ width: '100%', paddingLeft: '2rem', height: '34px', fontSize: '0.82rem', paddingBlock: 0 }}
                  />
                </div>

                {/* Media Grid */}
                {modalFilteredMedia.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No media items found matching criteria. Upload media in Media Library first.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '0.65rem',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    padding: '0.25rem'
                  }}>
                    {modalFilteredMedia.map(item => {
                      const isSelected = modalSelectedMediaIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleModalMedia(item.id)}
                          style={{
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '0.35rem',
                            border: isSelected ? '2px solid var(--accent-color)' : '1px solid #E2E8F0',
                            background: isSelected ? '#EFF6FF' : '#F8FAFC',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '100%',
                            height: 75,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: '#0B0F19',
                            position: 'relative'
                          }}>
                            {item.type === 'IMAGE' ? (
                              <img src={item.publicUrl} alt={item.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={item.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <span style={{
                              position: 'absolute',
                              top: '0.25rem',
                              right: '0.25rem',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#ffffff',
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.3rem',
                              borderRadius: '3px'
                            }}>
                              {item.type}
                            </span>
                          </div>

                          <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }} title={item.filename}>
                              {item.filename}
                            </span>
                            {isSelected ? (
                              <CheckCircle2 size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #CBD5E1', flexShrink: 0 }}></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Sequence & Slide Durations Configuration */}
              {modalSelectedMediaIds.length > 0 && (
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  {/* Section Header with Total Runtime Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} style={{ color: 'var(--accent-color)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Sequence Slide Durations ({modalSelectedMediaIds.length} items)
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#2563EB',
                      background: '#EFF6FF',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(37,99,235,0.2)'
                    }}>
                      Total Loop: {totalSelectedDuration}s ({Math.floor(totalSelectedDuration / 60)}m {totalSelectedDuration % 60}s)
                    </div>
                  </div>

                  {/* Batch Duration Toolbar (Available when selecting multiple media) */}
                  {modalSelectedMediaIds.length > 1 && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.65rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                          Set all images duration:
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {[5, 10, 15, 30, 60].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => applyBatchDuration(s)}
                              style={{
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                background: batchDurationInput === s ? '#2563EB' : '#F8FAFC',
                                color: batchDurationInput === s ? '#FFFFFF' : '#334155',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {s}s
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="3600"
                          value={batchDurationInput}
                          onChange={e => setBatchDurationInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          style={{
                            width: '56px',
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            textAlign: 'center',
                            fontWeight: 600
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>sec</span>
                        <button
                          type="button"
                          onClick={() => applyBatchDuration(batchDurationInput)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            cursor: 'pointer'
                          }}
                        >
                          Apply All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Individual Media Item Durations */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    paddingRight: '0.25rem'
                  }}>
                    {modalSelectedMediaIds.map((id, index) => {
                      const item = media.find(m => m.id === id);
                      if (!item) return null;
                      const dur = modalMediaDurations[id] || (item.type === 'IMAGE' ? 10 : 15);
                      const isImage = item.type === 'IMAGE';

                      return (
                        <div
                          key={id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            background: '#FFFFFF',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#64748B',
                              width: '18px',
                              textAlign: 'center'
                            }}>
                              #{index + 1}
                            </span>
                            <div style={{
                              width: '38px',
                              height: '24px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              background: '#0B0F19',
                              flexShrink: 0
                            }}>
                              {isImage ? (
                                <img src={item.publicUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <video src={item.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <p style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#0F172A',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '220px'
                              }}>
                                {item.filename}
                              </p>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: isImage ? '#D97706' : '#2563EB'
                              }}>
                                {isImage ? 'IMAGE (Slide Duration)' : 'VIDEO (Full Stream)'}
                              </span>
                            </div>
                          </div>

                          {/* Stepper Duration Control */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            {isImage ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                  type="button"
                                  onClick={() => stepSingleDuration(id, -1)}
                                  disabled={dur <= 1}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '4px',
                                    border: '1px solid #CBD5E1',
                                    background: '#F1F5F9',
                                    cursor: dur <= 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#475569'
                                  }}
                                >
                                  -
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                  <input
                                    type="number"
                                    min="1"
                                    max="3600"
                                    value={dur}
                                    onChange={e => updateSingleDuration(id, e.target.value)}
                                    style={{
                                      width: '46px',
                                      padding: '0.15rem 0.25rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      textAlign: 'center',
                                      borderRadius: '4px',
                                      border: '1px solid #CBD5E1'
                                    }}
                                  />
                                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>s</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => stepSingleDuration(id, 1)}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '4px',
                                    border: '1px solid #CBD5E1',
                                    background: '#F1F5F9',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#475569'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', padding: '0.2rem 0.5rem', background: '#F1F5F9', borderRadius: '4px' }}>
                                Video Length
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleModalMedia(id)}
                              title="Remove from sequence"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ffffff',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim() || modalSelectedMediaIds.length === 0 || savingPlaylist}
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    opacity: (!newPlaylistName.trim() || modalSelectedMediaIds.length === 0 || savingPlaylist) ? 0.6 : 1,
                    cursor: (!newPlaylistName.trim() || modalSelectedMediaIds.length === 0 || savingPlaylist) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingPlaylist ? 'Saving Sequence...' : 'Create Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
