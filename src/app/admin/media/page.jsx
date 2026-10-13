'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Upload,
  Film,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Search,
  Filter,
  PlayCircle,
  MoreVertical,
  Trash2,
  Plus,
  X,
  Download,
  Copy,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  Check
} from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function MediaLibrary() {
  const [media, setMedia] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Inspector & Selection State
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [previewModalAsset, setPreviewModalAsset] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const loadData = useCallback(async () => {
    try {
      const [mediaRes, playlistRes] = await Promise.allSettled([
        client.get('/media'),
        client.get('/playlists')
      ]);

      if (mediaRes.status === 'fulfilled' && Array.isArray(mediaRes.value?.data)) {
        setMedia(mediaRes.value.data);
        if (mediaRes.value.data.length > 0 && !selectedAsset) {
          setSelectedAsset(mediaRes.value.data[0]);
        }
      }
      if (playlistRes.status === 'fulfilled' && Array.isArray(playlistRes.value?.data)) {
        setPlaylists(playlistRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAsset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      Swal.fire({ icon: 'warning', title: 'Select File', text: 'Please select a video or image file to upload.' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await client.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newMedia = res.data;
      setMedia(prev => [newMedia, ...prev]);
      setSelectedAsset(newMedia);
      setFile(null);
      setShowUpload(false);
      e.target.reset();

      Swal.fire({
        icon: 'success',
        title: 'Media Uploaded',
        text: `"${newMedia.filename}" was uploaded to DOOH storage.`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.response?.data?.error || 'Failed to upload media to cloud storage.'
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle Delete
  const handleDeleteClick = (item) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Delete Media?',
      text: `Are you sure you want to delete "${item.filename}"? It will be removed from all playlists and displays.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.delete(`/media/${item.id}`);
          const updated = media.filter(m => m.id !== item.id);
          setMedia(updated);
          if (selectedAsset?.id === item.id) {
            setSelectedAsset(updated[0] || null);
          }
          Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Media asset deleted successfully.', timer: 1500, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.response?.data?.error || 'Failed to delete media.' });
        }
      }
    });
  };

  // Copy CDN Link
  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    Swal.fire({
      icon: 'success',
      title: 'Copied!',
      text: 'CDN public URL copied to clipboard.',
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = media.length;
    const videos = media.filter(m => m.type === 'VIDEO').length;
    const images = media.filter(m => m.type === 'IMAGE').length;
    return {
      total,
      videos,
      images,
      playlistsCount: playlists.length
    };
  }, [media, playlists]);

  // Filtered media
  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.filename?.toLowerCase().includes(q) && !item.type?.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (formatFilter === 'VIDEO' && item.type !== 'VIDEO') return false;
      if (formatFilter === 'IMAGE' && item.type !== 'IMAGE') return false;

      return true;
    });
  }, [media, searchQuery, formatFilter]);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Media Library</h1>
            <span style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#E2E8F0',
              color: '#0F172A',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {stats.total} Total Assets
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Upload, organize, preview, and deploy high-resolution DOOH media assets across your fleet.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowUpload(!showUpload)}
          style={{ width: 'auto', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
        >
          {showUpload ? <X size={16} /> : <Plus size={16} />}
          <span>{showUpload ? 'Close Upload' : 'Upload Media'}</span>
        </button>
      </div>

      {/* Top 4 Stats Cards (Stitch Design, Real Data Only) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Stat 1: Total Assets */}
        <div
          className="screen-stat-card"
          onClick={() => setFormatFilter('ALL')}
          style={{ cursor: 'pointer', borderColor: formatFilter === 'ALL' ? '#2563EB' : undefined }}
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
              <Film size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                All Assets
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{stats.total}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Total files</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>DOOH Ready</span>
        </div>

        {/* Stat 2: Video Clips */}
        <div
          className="screen-stat-card"
          onClick={() => setFormatFilter('VIDEO')}
          style={{ cursor: 'pointer', borderColor: formatFilter === 'VIDEO' ? '#2563EB' : undefined }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F0FDF4',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayCircle size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Video Clips
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A' }}>{stats.videos}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>MP4 / WebM</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600 }}>Motion</span>
        </div>

        {/* Stat 3: Static Images */}
        <div
          className="screen-stat-card"
          onClick={() => setFormatFilter('IMAGE')}
          style={{ cursor: 'pointer', borderColor: formatFilter === 'IMAGE' ? '#D97706' : undefined }}
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
              <ImageIcon size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Static Images
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706' }}>{stats.images}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>PNG / JPG</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>Banners</span>
        </div>

        {/* Stat 4: Playlists Linked */}
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
              <Layers size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Playlists Linked
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7C3AED' }}>{stats.playlistsCount}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Active channels</span>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600 }}>Linked</span>
        </div>
      </div>

      {/* Upload Dropzone (Collapsible) */}
      {showUpload && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', background: '#FFFFFF', border: '2px dashed #2563EB', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Upload New Media Asset
            </h2>
            <button
              onClick={() => setShowUpload(false)}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpload}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: '#F8FAFC', borderRadius: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Upload size={24} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <label style={{
                  display: 'inline-block',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}>
                  Choose Media File
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={e => setFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>
                  Supports MP4, WebM, PNG, and JPG up to 4K resolution.
                </p>
                {file && (
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#059669', marginTop: '0.5rem' }}>
                    Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {file && (
                <div style={{ maxWidth: '300px', maxHeight: '180px', borderRadius: '8px', overflow: 'hidden', background: '#0F172A' }}>
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="preview" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }} />
                  ) : (
                    <video src={URL.createObjectURL(file)} controls style={{ maxWidth: '100%', maxHeight: '180px' }} />
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={!file || uploading}
                style={{ width: 'auto', padding: '0.55rem 2rem' }}
              >
                {uploading ? 'Uploading to DOOH Cloud...' : 'Upload Asset'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Ribbon */}
      <div className="screens-toolbar">
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search assets by filename or format..."
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

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <select
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value)}
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
            <option value="ALL">All Formats ({media.length})</option>
            <option value="VIDEO">Videos Only ({stats.videos})</option>
            <option value="IMAGE">Images Only ({stats.images})</option>
          </select>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
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
        </div>
      </div>

      {/* Central Workspace: Media Grid (Left) + Asset Inspector (Right) */}
      <div className="media-workspace-grid">
        {/* Left: Media Cards Grid or Table */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748B' }}>
              <p>Loading media assets...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
              <Film size={40} style={{ color: '#94A3B8', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {media.length === 0 ? 'Your library is empty' : 'No assets match your search'}
              </h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '380px', margin: '0.35rem auto 1.25rem' }}>
                {media.length === 0 ? 'Upload images or videos to build your DOOH broadcast playlists.' : 'Try adjusting your search query or format filter.'}
              </p>
              {media.length === 0 && (
                <button
                  className="btn-primary"
                  onClick={() => setShowUpload(true)}
                  style={{ width: 'auto', display: 'inline-flex', padding: '0.5rem 1.25rem' }}
                >
                  Upload First Asset
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Bespoke Media Asset Grid (Stitch Design) */
            <div className="media-asset-grid">
              {filteredMedia.map(item => {
                const isSelected = selectedAsset?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`media-asset-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedAsset(item)}
                  >
                    {/* 16:9 Thumbnail Area */}
                    <div style={{
                      position: 'relative',
                      aspectRatio: '16 / 9',
                      background: '#0F172A',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.type === 'IMAGE' ? (
                        <img
                          src={item.publicUrl}
                          alt={item.filename}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <video
                          src={item.publicUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted
                        />
                      )}

                      {/* Top Overlay Badges */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: item.type === 'VIDEO' ? 'rgba(37, 99, 235, 0.85)' : 'rgba(15, 23, 42, 0.85)',
                          color: '#FFFFFF',
                          fontFamily: 'monospace'
                        }}>
                          {item.type}
                        </span>
                      </div>

                      {/* Duration Tag if Video */}
                      {item.durationSeconds > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.75)',
                          color: '#FFFFFF',
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}>
                          <Clock size={10} />
                          <span>{item.durationSeconds}s</span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h4
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1
                          }}
                          title={item.filename}
                        >
                          {item.filename}
                        </h4>

                        {/* More Menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.2rem' }}
                            title="Asset options"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === item.id && (
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
                                onClick={e => { e.stopPropagation(); setPreviewModalAsset(item); setActiveMenuId(null); }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  background: 'none',
                                  border: 'none',
                                  color: '#0F172A',
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <ExternalLink size={13} color="#2563EB" />
                                <span>Full Preview</span>
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleCopyUrl(item.publicUrl); setActiveMenuId(null); }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  background: 'none',
                                  border: 'none',
                                  color: '#0F172A',
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <Copy size={13} color="#2563EB" />
                                <span>Copy URL</span>
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteClick(item); }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: '#475569',
                          fontWeight: 600
                        }}>
                          {item.type === 'VIDEO' ? 'Broadcast Clip' : 'Still Graphic'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600 }}>
                          Select
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table Mode */
            <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem 1.25rem' }}>
              <table className="fleet-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>ASSET & PREVIEW</th>
                    <th style={{ width: '18%' }}>FORMAT</th>
                    <th style={{ width: '18%' }}>DURATION</th>
                    <th style={{ width: '26%', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedia.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedAsset(item)}
                      style={{ cursor: 'pointer', background: selectedAsset?.id === item.id ? '#EFF6FF' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '44px',
                            height: '28px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: '#0F172A',
                            flexShrink: 0
                          }}>
                            {item.type === 'IMAGE' ? (
                              <img src={item.publicUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <video src={item.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                            )}
                          </div>
                          <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.85rem' }}>{item.filename}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: item.type === 'VIDEO' ? '#EFF6FF' : '#F1F5F9',
                          color: item.type === 'VIDEO' ? '#2563EB' : '#475569'
                        }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                        {item.durationSeconds > 0 ? `${item.durationSeconds}s` : '--'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={e => { e.stopPropagation(); handleCopyUrl(item.publicUrl); }}
                            style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                          >
                            Copy URL
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteClick(item); }}
                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Asset Inspector Panel (Stitch Design) */}
        <div>
          {selectedAsset ? (
            <div className="inspector-card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.5px' }}>
                    Asset Inspector
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#94A3B8' }}>
                  #ID-{selectedAsset.id}
                </span>
              </div>

              {/* Aspect Preview Frame */}
              <div style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#0F172A',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedAsset.type === 'IMAGE' ? (
                  <img
                    src={selectedAsset.publicUrl}
                    alt={selectedAsset.filename}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <video
                    src={selectedAsset.publicUrl}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                  />
                )}
              </div>

              {/* Title & Metadata */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0, wordBreak: 'break-all' }}>
                  {selectedAsset.filename}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                  Stored in DOOH cloud CDN bucket • Ready for player loops
                </p>
              </div>

              {/* Specs Box */}
              <div style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '0.75rem',
                border: '1px solid #F1F5F9',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.78rem'
              }}>
                <div>
                  <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.7rem' }}>MEDIA TYPE</span>
                  <strong style={{ color: '#0F172A' }}>{selectedAsset.type}</strong>
                </div>
                <div>
                  <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.7rem' }}>DURATION</span>
                  <strong style={{ color: '#0F172A' }}>
                    {selectedAsset.durationSeconds > 0 ? `${selectedAsset.durationSeconds}s` : '10s (Default)'}
                  </strong>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => setPreviewModalAsset(selectedAsset)}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Full-Screen Player</span>
                </button>

                <button
                  onClick={() => handleCopyUrl(selectedAsset.publicUrl)}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Copy size={14} />
                  <span>Copy Public CDN URL</span>
                </button>

                <button
                  onClick={() => handleDeleteClick(selectedAsset)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Asset</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="inspector-card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94A3B8' }}>
              <Film size={32} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Select an asset to inspect details</p>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Preview Modal */}
      {previewModalAsset && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }} onClick={() => setPreviewModalAsset(null)}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '900px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                {previewModalAsset.filename}
              </h2>
              <button
                onClick={() => setPreviewModalAsset(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#0F172A',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxHeight: '65vh'
            }}>
              {previewModalAsset.type === 'IMAGE' ? (
                <img
                  src={previewModalAsset.publicUrl}
                  alt={previewModalAsset.filename}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
                />
              ) : (
                <video
                  src={previewModalAsset.publicUrl}
                  controls
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '65vh' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748B' }}>
              <span>Type: <strong>{previewModalAsset.type}</strong></span>
              <button
                onClick={() => handleCopyUrl(previewModalAsset.publicUrl)}
                style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 600 }}
              >
                Copy URL
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
