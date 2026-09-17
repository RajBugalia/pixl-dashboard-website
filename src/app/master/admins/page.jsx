'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import client from '@/api/client';

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const handleDeleteAdmin = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await client.delete(`/master/admins/${id}`);
      setAdmins(admins.filter(a => a.id !== id));
      alert('Admin deleted successfully');
      setDeleteConfirm({ isOpen: false, id: null });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete admin');
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
    client.get('/master/admins')
      .then(res => {
        setAdmins(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Manage Admins</h1>
      </div>

      <div className="glass-panel">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Registered Admins</h2>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading admins...</p>
        ) : admins.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No admins registered yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {admins.map(admin => (
              <div key={admin.id} style={{ 
                background: '#e5e7eb', 
                padding: '1rem', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{admin.name}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{admin.email}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#2563eb', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    {admin.role}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === admin.id ? null : admin.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeMenuId === admin.id && (
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
                          onClick={() => { setActiveMenuId(null); setDeleteConfirm({ isOpen: true, id: admin.id }); }}
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
            ))}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Admin?"
        message="Are you sure you want to delete this admin? This will unassign all their screens."
        onConfirm={handleDeleteAdmin}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </>
  );
}
