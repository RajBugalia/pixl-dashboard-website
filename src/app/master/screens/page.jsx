'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function NetworkScreens() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  useEffect(() => {
    client.get('/master/screens')
      .then(res => setScreens(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteClick = (screen) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Delete Screen?',
      text: `Are you sure you want to delete "${screen.name}"? This will remove it from all campaigns.`,
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
          
          await client.delete(`/master/screens/${screen.id}`);
          setScreens(screens.filter(s => s.id !== screen.id));
          
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Screen deleted successfully.',
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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Network Screens</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading screens...</p>
        </div>
      ) : screens.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No screens exist in the network. Pair a new screen to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {screens.map(screen => (
            <div key={screen.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{screen.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    background: screen.status === 'ONLINE' || screen.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: screen.status === 'ONLINE' || screen.status === 'ACTIVE' ? '#16a34a' : '#ef4444'
                  }}>
                    {screen.status}
                  </span>
                  <div style={{ position: 'relative', marginLeft: '0.5rem' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === screen.id ? null : screen.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeMenuId === screen.id && (
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
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(screen); }}
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
              
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                📍 {screen.location}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🔑 Code: <strong style={{ color: 'var(--text-primary)' }}>{screen.pairingCode}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', background: '#f9fafb', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                Admin: <strong style={{ color: 'var(--accent-color)' }}>{screen.assignedAdmin}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
