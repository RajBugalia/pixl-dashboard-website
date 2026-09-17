'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import client from '@/api/client';

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showBuilder, setShowBuilder] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const handleDeletePlaylist = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await client.delete(`/playlists/${id}`);
      setPlaylists(playlists.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Playlist deleted successfully!' });
      setDeleteConfirm({ isOpen: false, id: null });
    } catch (err) {
      console.error(err);
      alert('Failed to delete playlist');
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playlistRes, mediaRes] = await Promise.all([
        client.get('/playlists'),
        client.get('/media')
      ]);
      setPlaylists(playlistRes.data);
      setMedia(mediaRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMediaSelection = (id) => {
    if (selectedMediaIds.includes(id)) {
      setSelectedMediaIds(selectedMediaIds.filter(mId => mId !== id));
    } else {
      setSelectedMediaIds([...selectedMediaIds, id]);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName || selectedMediaIds.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await client.post('/playlists', {
        name: playlistName,
        mediaIds: selectedMediaIds
      });
      setMessage({ type: 'success', text: 'Playlist created successfully!' });
      setShowBuilder(false);
      setPlaylistName('');
      setSelectedMediaIds([]);
      fetchData(); // refresh list
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create playlist' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading Playlists...</p>;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Playlists</h1>
        {!showBuilder && (
          <button className="btn-primary" onClick={() => setShowBuilder(true)} style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
            + Create Playlist
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
        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid rgba(0, 0, 0,0.1)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Playlist Builder</h2>
            <button onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Playlist Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={playlistName} 
              onChange={e => setPlaylistName(e.target.value)} 
              placeholder="e.g. Summer Promo Rotation" 
              required 
            />
          </div>

          <label className="input-label">Select Media Files ({selectedMediaIds.length} selected)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {media.map(item => (
              <div 
                key={item.id} 
                onClick={() => toggleMediaSelection(item.id)}
                style={{ 
                  cursor: 'pointer',
                  borderRadius: '8px', 
                  padding: '4px',
                  border: selectedMediaIds.includes(item.id) ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'rgba(0,0,0,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {item.type === 'IMAGE' ? (
                  <img src={item.publicUrl} alt={item.filename} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <video src={item.publicUrl} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                )}
              </div>
            ))}
          </div>

          <button 
            className="btn-primary" 
            onClick={handleCreatePlaylist} 
            disabled={!playlistName || selectedMediaIds.length === 0 || saving}
          >
            {saving ? 'Saving...' : 'Save Playlist'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {playlists.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No playlists found. Create one to organize your media!
            </div>
          ) : (
            playlists.map(playlist => (
              <div key={playlist.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(0, 0, 0,0.1)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                    {playlist.name}
                  </h3>
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === playlist.id ? null : playlist.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeMenuId === playlist.id && (
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
                          onClick={() => { setActiveMenuId(null); setDeleteConfirm({ isOpen: true, id: playlist.id }); }}
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
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Contains {playlist.mediaCount} media items
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {playlist.media.map(m => (
                    <div key={m.id} style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.5)' }}>
                       {m.type === 'IMAGE' ? (
                        <img src={m.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : (
                        <video src={m.publicUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Playlist?"
        message="Are you sure you want to delete this playlist? This will ALSO delete any campaigns using it!"
        onConfirm={handleDeletePlaylist}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </>
  );
}
