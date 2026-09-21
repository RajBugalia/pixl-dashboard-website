'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!campaignName || !startDate || !endDate || !selectedPlaylistId || selectedScreenIds.length === 0) return;
    
    setSaving(true);
    try {
      await client.post('/campaigns', {
        name: campaignName,
        startDate: startDate,
        endDate: endDate,
        playlistId: selectedPlaylistId,
        targetScreenIds: selectedScreenIds
      });

      Swal.fire({
        icon: 'success',
        title: 'Campaign Created!',
        text: 'Successfully pushed to screens.',
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
      text: `Are you sure you want to delete "${campaign.name}"? It will stop immediately on all screens.`,
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
            text: 'Campaign deleted successfully.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: 'Failed to delete campaign'
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Campaigns...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Campaigns</h1>
        {!showBuilder && (
          <button className="btn-primary" onClick={() => setShowBuilder(true)} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
            + New Campaign
          </button>
        )}
      </div>

      {showBuilder ? (
        <form className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Campaign Builder</h2>
            <button type="button" onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Campaign Name</label>
            <input type="text" className="input-field" value={campaignName} onChange={e => setCampaignName(e.target.value)} required />
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

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Select Playlist</label>
            {playlists.length === 0 ? (
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', color: '#ef4444' }}>
                You have no playlists! Please create a playlist first.
              </div>
            ) : (
              <select className="input-field" value={selectedPlaylistId} onChange={e => setSelectedPlaylistId(e.target.value)} required style={{ background: '#ffffff', color: 'var(--text-primary)' }}>
                <option value="" disabled>-- Select a Playlist --</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.mediaCount} assets)</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label className="input-label">Select Target Screens</label>
            {screens.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No screens paired to your account.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {screens.map(screen => (
                  <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', cursor: 'pointer', border: selectedScreenIds.includes(screen.id) ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedScreenIds.includes(screen.id)}
                      onChange={() => toggleScreenSelection(screen.id)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{screen.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{screen.location} &bull; {screen.status}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className={`btn-primary ${saving ? 'loading' : ''}`} disabled={saving || !campaignName || !startDate || !endDate || !selectedPlaylistId || selectedScreenIds.length === 0}>
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
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{camp.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {start} &mdash; {end} <br />
                      Playlist: <strong>{camp.playlist?.name}</strong>
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
