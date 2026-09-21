'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Trash2, Plus, UserPlus } from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // Create Admin Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', passwordHash: '' });
  const [isCreating, setIsCreating] = useState(false);

  const fetchAdmins = () => {
    setLoading(true);
    client.get('/master/admins')
      .then(res => {
        setAdmins(res.data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const handleDeleteClick = (admin) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Delete Admin?',
      text: `Are you sure you want to delete ${admin.name}? This will unassign all their screens.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Add loading state to Swal
          Swal.fire({
            title: 'Deleting...',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });
          
          await client.delete(`/master/admins/${admin.id}`);
          setAdmins(admins.filter(a => a.id !== admin.id));
          
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Admin has been deleted successfully.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Failed to delete',
            text: err.response?.data?.error || 'Cannot delete admin'
          });
        }
      }
    });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await client.post('/auth/signup', {
        name: newAdmin.name,
        email: newAdmin.email,
        passwordHash: newAdmin.passwordHash,
        role: 'ADMIN'
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Created!',
        text: 'New Admin has been registered successfully.',
        timer: 1500,
        showConfirmButton: false
      });
      
      setNewAdmin({ name: '', email: '', passwordHash: '' });
      setShowCreateForm(false);
      fetchAdmins(); // Refresh the list
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: err.response?.data?.message || 'Failed to create admin'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Manage Admins</h1>
        <button 
          className="btn-primary" 
          style={{ width: 'auto' }}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : <><UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Add Admin</>}
        </button>
      </div>

      {showCreateForm && (
        <div className="glass-panel" style={{ marginBottom: '2rem', border: '1px solid var(--accent-color)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Register New Admin</h2>
          <form onSubmit={handleCreateAdmin}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="John Doe" 
                value={newAdmin.name}
                onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="admin@example.com" 
                value={newAdmin.email}
                onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                required
              />
            </div>
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={newAdmin.passwordHash}
                onChange={e => setNewAdmin({...newAdmin, passwordHash: e.target.value})}
                required
                minLength={6}
              />
            </div>
            <button 
              type="submit" 
              className={`btn-primary ${isCreating ? 'loading' : ''}`} 
              disabled={isCreating}
              style={{ width: 'auto' }}
            >
              {isCreating ? 'Registering...' : 'Create Admin'}
            </button>
          </form>
        </div>
      )}

      <div className="glass-panel">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Registered Admins</h2>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
             <p style={{ color: 'var(--text-secondary)' }}>Loading admins...</p>
          </div>
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
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{admin.name}</h3>
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
                        background: '#ffffff',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        zIndex: 10,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        minWidth: '120px'
                      }}>
                        <button 
                          onClick={() => handleDeleteClick(admin)}
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
    </>
  );
}
