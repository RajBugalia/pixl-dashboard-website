'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Check,
  AlertCircle,
  RotateCw,
  FileUp
} from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function MediaLibrary() {
  const [media, setMedia] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Batch Upload State
  const [showUpload, setShowUpload] = useState(false);
  const [queue, setQueue] = useState([]); // [{ id, file, name, size, type, previewUrl, status, progress, errorMsg }]
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  // Helper: Add multiple files to batch upload queue
  const addFilesToQueue = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter(f => 
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (validFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Unsupported Files',
        text: 'Please select valid image (PNG, JPG, WEBP) or video (MP4, WebM) files.'
      });
      return;
    }

    const newItems = validFiles.map((f, idx) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      type: f.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      previewUrl: URL.createObjectURL(f),
      status: 'pending', // 'pending' | 'uploading' | 'completed' | 'error'
      progress: 0,
      errorMsg: null
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  // Remove individual file from batch queue
  const removeFileFromQueue = (id) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
      return prev.filter(i => i.id !== id);
    });
  };

  // Clear entire queue
  const clearQueue = () => {
    queue.forEach(item => {
      if (item.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (_) {}
      }
    });
    setQueue([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Queue metrics calculation
  const queueStats = useMemo(() => {
    const total = queue.length;
    const completed = queue.filter(q => q.status === 'completed').length;
    const pending = queue.filter(q => q.status === 'pending').length;
    const errors = queue.filter(q => q.status === 'error').length;
    const totalBytes = queue.reduce((acc, q) => acc + (q.size || 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const imagesCount = queue.filter(q => q.type === 'IMAGE').length;
    const videosCount = queue.filter(q => q.type === 'VIDEO').length;
    return { total, completed, pending, errors, totalMb, imagesCount, videosCount };
  }, [queue]);

  // Execute Batch Upload
  const handleBatchUpload = async (e) => {
    if (e) e.preventDefault();
    const itemsToUpload = queue.filter(item => item.status === 'pending' || item.status === 'error');
    if (itemsToUpload.length === 0) {
      Swal.fire({ icon: 'info', title: 'Nothing to upload', text: 'Please add new media files to the queue.' });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;
    let newlyUploaded = [];

    // Process files with concurrency limit
    const CONCURRENCY_LIMIT = 2;
    const queueCopy = [...itemsToUpload];

    const uploadWorker = async () => {
      while (queueCopy.length > 0) {
        const item = queueCopy.shift();
        if (!item) break;

        // Set status to uploading
        setQueue(prev => prev.map(it => it.id === item.id ? { ...it, status: 'uploading', progress: 0, errorMsg: null } : it));

        const formData = new FormData();
        formData.append('file', item.file);

        try {
          const res = await client.post('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              if (evt.total) {
                const pct = Math.round((evt.loaded * 100) / evt.total);
                setQueue(prev => prev.map(it => it.id === item.id ? { ...it, progress: Math.min(pct, 98) } : it));
              }
            }
          });

          const createdMedia = res.data;
          successCount++;
          newlyUploaded.push(createdMedia);

          // Update item state to completed
          setQueue(prev => prev.map(it => it.id === item.id ? { ...it, status: 'completed', progress: 100 } : it));

          // Immediately inject newly uploaded media into media list
          setMedia(prev => [createdMedia, ...prev.filter(m => m.id !== createdMedia.id)]);
        } catch (err) {
          failCount++;
          const msg = err.response?.data?.error || err.message || 'Upload failed';
          setQueue(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', errorMsg: msg } : it));
        }
      }
    };

    // Run parallel upload workers
    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, itemsToUpload.length) }, () => uploadWorker());
    await Promise.all(workers);

    setUploading(false);

    if (newlyUploaded.length > 0) {
      setSelectedAsset(newlyUploaded[0]);
    }

    if (failCount === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Batch Upload Complete',
        text: `Successfully uploaded ${successCount} media ${successCount === 1 ? 'asset' : 'assets'} to DOOH cloud storage.`,
        timer: 2000,
        showConfirmButton: false
      });
      // Clear completed after brief display
      setTimeout(() => {
        clearQueue();
        setShowUpload(false);
      }, 1400);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Upload Partially Complete',
        text: `${successCount} uploaded successfully, ${failCount} failed. You can retry the failed items.`,
        confirmButtonColor: '#2563EB'
      });
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

        <div className="master-header-actions">
          <button
            className={showUpload ? "master-btn-secondary" : "master-btn-primary"}
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? <X size={16} /> : <Plus size={16} />}
            <span>{showUpload ? 'Close Upload' : 'Upload Media'}</span>
          </button>
        </div>
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

      {/* Batch Upload Dropzone & Queue Manager (Collapsible) */}
      {showUpload && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileUp size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Batch Media Upload
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                  Select or drag &amp; drop multiple videos and images to upload simultaneously to cloud storage.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {queue.length > 0 && (
                <span style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {queue.length} {queue.length === 1 ? 'File' : 'Files'} Selected ({queueStats.totalMb} MB)
                </span>
              )}
              <button
                onClick={() => {
                  if (uploading) {
                    Swal.fire({ icon: 'info', title: 'Upload in Progress', text: 'Please wait until the current batch upload finishes.' });
                    return;
                  }
                  setShowUpload(false);
                }}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '0.35rem' }}
                title="Close Upload Panel"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              if (e.dataTransfer.files?.length) {
                addFilesToQueue(e.dataTransfer.files);
              }
            }}
            onClick={() => {
              if (!uploading) fileInputRef.current?.click();
            }}
            style={{
              border: `2px dashed ${isDragOver ? '#2563EB' : '#CBD5E1'}`,
              background: isDragOver ? '#EFF6FF' : '#F8FAFC',
              borderRadius: '12px',
              padding: queue.length > 0 ? '1.5rem 1rem' : '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: queue.length > 0 ? '1.25rem' : 0
            }}
          >
            <input
              type="file"
              multiple
              accept="video/*,image/*"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) {
                  addFilesToQueue(e.target.files);
                  e.target.value = '';
                }
              }}
              style={{ display: 'none' }}
              disabled={uploading}
            />

            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#FFFFFF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.12)'
            }}>
              <Upload size={24} />
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.35rem' }}>
              Drag &amp; drop multiple media files here, or <span style={{ color: '#2563EB', textDecoration: 'underline' }}>browse</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, maxWidth: '480px', marginInline: 'auto' }}>
              Batch upload support for MP4, WebM, PNG, JPG, JPEG, and WEBP assets (up to 500MB per file).
            </p>
          </div>

          {/* Queued Files Manager */}
          {queue.length > 0 && (
            <div>
              {/* Queue Summary & Control Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: '#F1F5F9',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {queue.length} {queue.length === 1 ? 'Asset' : 'Assets'} Queued
                  </span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span style={{ color: '#475569' }}>
                    {queueStats.imagesCount} Images, {queueStats.videosCount} Videos
                  </span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span style={{ color: '#475569', fontWeight: 600 }}>
                    {queueStats.totalMb} MB Total
                  </span>
                  {queueStats.completed > 0 && (
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      background: '#DCFCE7',
                      color: '#15803D',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      ✓ {queueStats.completed} Completed
                    </span>
                  )}
                  {queueStats.errors > 0 && (
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      ⚠ {queueStats.errors} Failed
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="master-btn-secondary"
                    style={{ height: '32px', fontSize: '0.8rem', padding: '0 0.75rem' }}
                  >
                    <Plus size={14} /> Add More
                  </button>
                  <button
                    type="button"
                    onClick={clearQueue}
                    disabled={uploading}
                    style={{
                      height: '32px',
                      padding: '0 0.75rem',
                      fontSize: '0.8rem',
                      background: 'none',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: '#64748B',
                      cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Items Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                gap: '0.75rem',
                maxHeight: '340px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
                marginBottom: '1.25rem'
              }}>
                {queue.map(item => {
                  const isUploading = item.status === 'uploading';
                  const isCompleted = item.status === 'completed';
                  const isError = item.status === 'error';

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        background: '#FFFFFF',
                        border: isError ? '1px solid #FCA5A5' : isCompleted ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Thumbnail Preview */}
                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#0F172A',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        {item.type === 'IMAGE' ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <>
                            <video
                              src={item.previewUrl}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Film size={16} color="#ffffff" />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Info & Progress */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.72rem', color: '#64748B' }}>
                          <span>{(item.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span style={{
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: item.type === 'VIDEO' ? '#DCFCE7' : '#FEF3C7',
                            color: item.type === 'VIDEO' ? '#15803D' : '#B45309',
                            fontWeight: 700
                          }}>
                            {item.type}
                          </span>

                          {/* Status */}
                          {item.status === 'pending' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#64748B' }}>
                              <Clock size={12} /> Ready
                            </span>
                          )}
                          {isUploading && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563EB', fontWeight: 600 }}>
                              <RotateCw size={12} className="animate-spin" /> {item.progress}%
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#16A34A', fontWeight: 700 }}>
                              <CheckCircle size={12} /> Uploaded
                            </span>
                          )}
                          {isError && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626', fontWeight: 600 }} title={item.errorMsg}>
                              <AlertCircle size={12} /> Failed
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {isUploading && (
                          <div style={{ height: 4, width: '100%', background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden', marginTop: '0.35rem' }}>
                            <div style={{ height: '100%', width: `${item.progress}%`, background: '#2563EB', transition: 'width 0.2s ease' }} />
                          </div>
                        )}
                        {isCompleted && (
                          <div style={{ height: 3, width: '100%', background: '#10B981', borderRadius: 9999, marginTop: '0.35rem' }} />
                        )}
                        {isError && (
                          <div style={{ height: 3, width: '100%', background: '#EF4444', borderRadius: 9999, marginTop: '0.35rem' }} />
                        )}
                      </div>

                      {/* Action Button */}
                      {!uploading && !isCompleted && (
                        <button
                          type="button"
                          onClick={() => removeFileFromQueue(item.id)}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
                          title="Remove from batch"
                        >
                          <X size={15} />
                        </button>
                      )}
                      {isCompleted && (
                        <CheckCircle size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Batch Action Footer Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #F1F5F9'
              }}>
                <div>
                  {uploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563EB', fontSize: '0.85rem', fontWeight: 600 }}>
                      <RotateCw size={15} className="animate-spin" />
                      <span>Uploading batch... ({queueStats.completed} of {queue.length} completed)</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      Ready to upload {queueStats.pending + queueStats.errors} {queueStats.pending + queueStats.errors === 1 ? 'file' : 'files'} to DOOH storage.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    disabled={uploading}
                    className="master-btn-secondary"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchUpload}
                    disabled={uploading || queueStats.pending + queueStats.errors === 0}
                    className="master-btn-primary"
                    style={{ minWidth: '160px' }}
                  >
                    <Upload size={16} />
                    <span>
                      {uploading
                        ? 'Uploading Batch...'
                        : `Upload All (${queueStats.pending + queueStats.errors} Files)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
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

                      {/* Duration Tag for Video */}
                      {item.type === 'VIDEO' && (
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
                          <span>Video</span>
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
                        {item.type === 'VIDEO' ? 'Video Stream' : 'Set in Playlists'}
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
                  <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.7rem' }}>PLAYBACK DURATION</span>
                  <strong style={{ color: selectedAsset.type === 'IMAGE' ? '#2563EB' : '#0F172A', fontSize: '0.78rem' }}>
                    {selectedAsset.type === 'IMAGE' ? 'Configured in Playlists' : 'Video Runtime'}
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
