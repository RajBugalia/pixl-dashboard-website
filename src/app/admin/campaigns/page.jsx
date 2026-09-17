'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import client from '@/api/client';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showBuilder, setShowBuilder] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const handleDeleteCampaign = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await client.delete(`/campaigns/${id}`);
      setCampaigns(campaigns.filter(c => c.id !== id));
      setMessage({ type: 'success', text: 'Campaign deleted successfully!' });
      setDeleteConfirm({ isOpen: false, id: null });
    } catch (err) {
      console.error(err);
      alert('Failed to delete campaign');
    }
  };

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
    setMessage(null);
    try {
      await client.post('/campaigns', {
        name: campaignName,
        startDate: startDate, // e.g. "2026-09-16T14:30"
        endDate: endDate,
        playlistId: selectedPlaylistId,
        targetScreenIds: selectedScreenIds
      });

      setMessage({ type: 'success', text: 'Campaign created and pushed to screens successfully!' });
      setShowBuilder(false);
      
      // Reset Form
      setCampaignName('');
      setStartDate('');
      setEndDate('');
      setSelectedPlaylistId('');
      setSelectedScreenIds([]);
      
      fetchData(); // Refresh list
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create campaign' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading Campaigns...</p>;
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

      {message && (
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: message.type === 'success' ? '#16a34a' : '#ef4444'
        }}>
          {message.text}
        </div>
      )}

      {showBuilder ? (
        <form className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid rgba(0, 0, 0,0.1)', paddingBottom: '1rem' }}>
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
              <div style={{ padding: '1rem', background: 'rgba(0, 0, 0,0.05)', borderRadius: '8px', color: '#ef4444' }}>
                You have no playlists! Please create a playlist first.
              </div>
            ) : (
              <select className="input-field" value={selectedPlaylistId} onChange={e => setSelectedPlaylistId(e.target.value)} required style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}>
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
                  <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(0, 0, 0,0.05)', borderRadius: '8px', cursor: 'pointer', border: selectedScreenIds.includes(screen.id) ? '1px solid var(--accent)' : '1px solid transparent' }}>
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

          <button type="submit" className="btn-primary" disabled={saving || !campaignName || !startDate || !endDate || !selectedPlaylistId || selectedScreenIds.length === 0}>
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
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent)' }}>
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
                          background: 'var(--panel-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          zIndex: 10,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                          minWidth: '120px'
                        }}>
                          <button 
                            onClick={() => { setActiveMenuId(null); setDeleteConfirm({ isOpen: true, id: camp.id }); }}
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

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Campaign?"
        message="Are you sure you want to delete this campaign? It will stop immediately on all screens."
        onConfirm={handleDeleteCampaign}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </>
  );
}
