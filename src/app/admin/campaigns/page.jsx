'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2, Edit2, Grid, Monitor, Layers } from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campRes, screenRes, playlistRes] = await Promise.all([
        client.get('/campaigns'),
        client.get('/admin/screens'),
        client.get('/playlists')
      ]);
      setCampaigns(campRes.data);
      setScreens(screenRes.data);
      setPlaylists(playlistRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleScreenSelection = (id) => {
    if (selectedScreenIds.includes(id)) {
      setSelectedScreenIds(selectedScreenIds.filter(sId => sId !== id));
    } else {
      setSelectedScreenIds([...selectedScreenIds, id]);
    }
  };

  const groupedScreensMap = screens.reduce((acc, s) => {
    const grp = s.groupName?.trim();
    if (grp) {
      if (!acc[grp]) acc[grp] = [];
      acc[grp].push(s);
    }
    return acc;
  }, {});

  const groupNames = Object.keys(groupedScreensMap);
  const ungroupedScreens = screens.filter(s => !s.groupName || !s.groupName.trim());

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

    if (!campaignName || !startDate || !endDate || selectedScreenIds.length === 0) return;
    if (!isMulti && !selectedPlaylistId) return;

    // Build zones array if multiple screens
    const zonesArray = [];
    if (isMulti) {
      for (let r = 0; r < splitRows; r++) {
        for (let c = 0; c < splitCols; c++) {
          const zIdx = r * splitCols + c;
          const pId = zonePlaylists[zIdx] || playlists[0]?.id;
          if (!pId) {
            Swal.fire({
              icon: 'warning',
              title: 'Assign All Zones',
              text: `Please select a playlist for Zone ${zIdx + 1} (Row ${r + 1}, Col ${c + 1}).`
            });
            return;
          }
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
      
      fetchData(); // Refresh list
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
        if (!value) {
          return 'You need to write something!';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: 'Saving...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });
          
          await client.put(`/campaigns/${campaign.id}`, { name: result.value });
          setCampaigns(campaigns.map(c => c.id === campaign.id ? { ...c, name: result.value } : c));
          
          Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: 'Campaign name updated successfully.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.response?.data?.error || 'Failed to update campaign name'
          });
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
          Swal.fire({
            title: 'Deleting...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });
          
          await client.delete(`/campaigns/${campaign.id}`);
          setCampaigns(campaigns.filter(c => c.id !== campaign.id));
          
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Campaign removed and stopped.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.response?.data?.error || 'Failed to delete campaign'
          });
        }
      }
    });
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Campaigns</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Schedule and push single or multiple split-screen advertisements to your displays.
          </p>
        </div>
        {!showBuilder && (
          <button className="btn-primary" onClick={() => setShowBuilder(true)} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
            + New Campaign
          </button>
        )}
      </div>

      {showBuilder ? (
        <form className="glass-panel" style={{ maxWidth: '850px', margin: '0 auto' }} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Campaign Builder</h2>
            <button type="button" onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
          </div>

          {/* Top Toggle: Single Screen vs Multiple Screen */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label className="input-label" style={{ marginBottom: '0.5rem' }}>Display Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setLayoutMode('SINGLE')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: layoutMode === 'SINGLE' ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                  background: layoutMode === 'SINGLE' ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Monitor size={24} color={layoutMode === 'SINGLE' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                <div>
                  <div style={{ fontWeight: 600, color: layoutMode === 'SINGLE' ? 'var(--accent-color)' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Single Screen
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Full-screen playback with one playlist
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('MULTIPLE')}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: layoutMode === 'MULTIPLE' ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                  background: layoutMode === 'MULTIPLE' ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Grid size={24} color={layoutMode === 'MULTIPLE' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                <div>
                  <div style={{ fontWeight: 600, color: layoutMode === 'MULTIPLE' ? 'var(--accent-color)' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                    Multiple Screen (Split Grid)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Play concurrent ads in split rows & columns
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Campaign Name</label>
            <input type="text" className="input-field" placeholder="e.g. Summer Promo 2026" value={campaignName} onChange={e => setCampaignName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">From Date & Time</label>
              <input type="datetime-local" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">To Date & Time</label>
              <input type="datetime-local" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>

          {/* SINGLE SCREEN SETTINGS */}
          {layoutMode === 'SINGLE' && (
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">Select Playlist</label>
              {playlists.length === 0 ? (
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', color: '#ef4444' }}>
                  You have no playlists! Please create a playlist first.
                </div>
              ) : (
                <select 
                  className="input-field" 
                  value={selectedPlaylistId} 
                  onChange={e => setSelectedPlaylistId(e.target.value)} 
                  required 
                  style={{ background: '#ffffff', color: 'var(--text-primary)' }}
                >
                  <option value="" disabled>-- Select a Playlist --</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.mediaCount} assets)</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* MULTIPLE SCREEN (SPLIT GRID) SETTINGS */}
          {layoutMode === 'MULTIPLE' && (
            <div style={{ marginBottom: '1.75rem', padding: '1.25rem', background: '#f9fafb', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600 }}>Grid Layout Configuration</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                    Choose the grid split and assign playlists to each concurrent zone.
                  </p>
                </div>
                {/* Presets */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setSplitRows(1); setSplitCols(2); }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: splitRows === 1 && splitCols === 2 ? '1px solid var(--accent-color)' : '1px solid #d1d5db',
                      background: splitRows === 1 && splitCols === 2 ? 'var(--accent-color)' : '#ffffff',
                      color: splitRows === 1 && splitCols === 2 ? '#ffffff' : '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    1 Row × 2 Cols (Vertical Split)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSplitRows(2); setSplitCols(1); }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: splitRows === 2 && splitCols === 1 ? '1px solid var(--accent-color)' : '1px solid #d1d5db',
                      background: splitRows === 2 && splitCols === 1 ? 'var(--accent-color)' : '#ffffff',
                      color: splitRows === 2 && splitCols === 1 ? '#ffffff' : '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    2 Rows × 1 Col (Horizontal Split)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSplitRows(2); setSplitCols(2); }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: splitRows === 2 && splitCols === 2 ? '1px solid var(--accent-color)' : '1px solid #d1d5db',
                      background: splitRows === 2 && splitCols === 2 ? 'var(--accent-color)' : '#ffffff',
                      color: splitRows === 2 && splitCols === 2 ? '#ffffff' : '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    2 Rows × 2 Cols (4 Quadrants)
                  </button>
                </div>
              </div>

              {/* Rows and Columns Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                    Number of Rows:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSplitRows(r)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: splitRows === r ? '2px solid var(--accent-color)' : '1px solid #d1d5db',
                          background: splitRows === r ? '#ffffff' : '#f3f4f6',
                          color: splitRows === r ? 'var(--accent-color)' : 'var(--text-primary)',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {r} {r === 1 ? 'Row' : 'Rows'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                    Number of Columns:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSplitCols(c)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: splitCols === c ? '2px solid var(--accent-color)' : '1px solid #d1d5db',
                          background: splitCols === c ? '#ffffff' : '#f3f4f6',
                          color: splitCols === c ? 'var(--accent-color)' : 'var(--text-primary)',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {c} {c === 1 ? 'Column' : 'Columns'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Monitor Screen Grid Preview */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                  Zone Playlist Assignment ({splitRows * splitCols} Active Zones)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${splitCols}, 1fr)`,
                  gridTemplateRows: `repeat(${splitRows}, minmax(130px, auto))`,
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#ffffff',
                  border: '2px dashed #d1d5db',
                  borderRadius: '10px'
                }}>
                  {Array.from({ length: splitRows }).map((_, r) => (
                    Array.from({ length: splitCols }).map((_, c) => {
                      const zoneIndex = r * splitCols + c;
                      const assignedId = zonePlaylists[zoneIndex] || '';

                      return (
                        <div key={zoneIndex} style={{
                          padding: '0.85rem',
                          background: '#f9fafb',
                          border: assignedId ? '1px solid var(--accent-color)' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Zone {zoneIndex + 1}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Row {r + 1}, Col {c + 1}
                            </span>
                          </div>

                          <div>
                            <select
                              className="input-field"
                              value={assignedId}
                              onChange={e => handleZonePlaylistChange(zoneIndex, e.target.value)}
                              required
                              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem', background: '#ffffff', boxSizing: 'border-box' }}
                            >
                              <option value="" disabled>-- Assign Playlist --</option>
                              {playlists.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.mediaCount} assets)</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TARGET SCREENS SELECTION (GROUPS + UNGROUPED) */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label className="input-label" style={{ margin: 0 }}>Select Target Screens</label>
              <span style={{ fontSize: '0.85rem', color: selectedScreenIds.length > 0 ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: 500 }}>
                {selectedScreenIds.length} of {screens.length} screens selected
              </span>
            </div>

            {screens.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No screens paired to your account.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Groups Section */}
                {groupNames.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Screen Groups
                    </div>
                    {groupNames.map(grp => {
                      const groupScreens = groupedScreensMap[grp] || [];
                      const groupIds = groupScreens.map(s => s.id);
                      const isAllGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedScreenIds.includes(id));
                      const selectedCount = groupIds.filter(id => selectedScreenIds.includes(id)).length;

                      return (
                        <div key={grp} style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fafafa', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '0.75rem 1rem', 
                              background: isAllGroupSelected ? 'rgba(37, 99, 235, 0.08)' : '#f3f4f6',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--glass-border)'
                            }}
                            onClick={() => toggleGroupSelection(grp)}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                              <input 
                                type="checkbox"
                                checked={isAllGroupSelected}
                                onChange={() => toggleGroupSelection(grp)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '18px', height: '18px' }}
                              />
                              <span>🏷️ {grp}</span>
                            </label>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {selectedCount}/{groupIds.length} screens
                            </span>
                          </div>

                          <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {groupScreens.map(screen => (
                              <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#ffffff', borderRadius: '6px', cursor: 'pointer', border: selectedScreenIds.includes(screen.id) ? '1px solid var(--accent-color)' : '1px solid #e5e7eb' }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedScreenIds.includes(screen.id)}
                                  onChange={() => toggleScreenSelection(screen.id)}
                                  style={{ width: '16px', height: '16px' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{screen.name}</span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{screen.location}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Ungrouped Screens Section */}
                {ungroupedScreens.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {groupNames.length > 0 ? 'Individual / Ungrouped Screens' : 'All Screens'}
                    </div>
                    {ungroupedScreens.map(screen => (
                      <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#ffffff', borderRadius: '8px', cursor: 'pointer', border: selectedScreenIds.includes(screen.id) ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedScreenIds.includes(screen.id)}
                          onChange={() => toggleScreenSelection(screen.id)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{screen.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{screen.location}</div>
                          </div>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: screen.status === 'ONLINE' || screen.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: screen.status === 'ONLINE' || screen.status === 'ACTIVE' ? '#16a34a' : '#ef4444'
                          }}>
                            {screen.status}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className={`btn-primary ${saving ? 'loading' : ''}`} 
            disabled={saving || !campaignName || !startDate || !endDate || selectedScreenIds.length === 0 || (layoutMode === 'SINGLE' && !selectedPlaylistId)}
          >
            {saving ? 'Launching...' : 'Launch Campaign'}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {campaigns.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No campaigns running. Create one to push content to your screens!
            </div>
          ) : (
            campaigns.map(camp => {
              const start = new Date(camp.startDate).toLocaleString();
              const end = new Date(camp.endDate).toLocaleString();

              return (
                <div key={camp.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{camp.name}</h3>
                      {camp.layoutType === 'SPLIT' ? (
                        <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                          🔲 Split Screen ({camp.splitRows}x{camp.splitCols})
                        </span>
                      ) : (
                        <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                          📺 Single Screen
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                      {start} &mdash; {end} <br />
                      {camp.layoutType === 'SPLIT' ? (
                        <span>Zones: <strong>{camp.splitRows * camp.splitCols} concurrent ad streams</strong></span>
                      ) : (
                        <span>Playlist: <strong>{camp.playlist?.name || 'Assigned'}</strong></span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                        {camp.targetScreens?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Screens</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === camp.id ? null : camp.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <MoreVertical size={20} />
                      </button>
                      {activeMenuId === camp.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%',
                          background: '#ffffff',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          zIndex: 10,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          minWidth: '120px'
                        }}>
                          <button 
                            onClick={() => handleEditClick(camp)}
                            style={{
                              width: '100%',
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              background: 'none', border: 'none',
                              color: 'var(--text-primary)', cursor: 'pointer',
                              padding: '0.5rem', borderRadius: '4px',
                              textAlign: 'left', fontSize: '0.9rem',
                              marginBottom: '0.25rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(camp)}
                            style={{
                              width: '100%',
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              background: 'none', border: 'none',
                              color: '#ef4444', cursor: 'pointer',
                              padding: '0.5rem', borderRadius: '4px',
                              textAlign: 'left', fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
