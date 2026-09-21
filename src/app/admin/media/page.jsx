'use client';
import { useState, useEffect } from 'react';
import { Upload, Film, Image as ImageIcon, CheckCircle, Clock, Search, Filter, PlayCircle, MoreVertical, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function MediaLibrary() {
  const [media, setMedia] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  useEffect(() => {
    client.get('/media').then(res => setMedia(res.data)).catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await client.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'Media uploaded successfully!' });
      setMedia([...media, res.data]);
      setFile(null);
      // Reset input file
      e.target.reset();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setActiveMenuId(null);
    Swal.fire({
      title: 'Delete Media?',
      text: `Are you sure you want to delete "${item.filename}"? It will be removed from all playlists.`,
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
          
          await client.delete(`/media/${item.id}`);
          setMedia(media.filter(m => m.id !== item.id));
          
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Media deleted successfully.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.response?.data?.error || 'Failed to delete media'
          });
        }
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Media Library</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Upload Section */}
        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Upload New Media</h2>
          
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

          <form onSubmit={handleUpload}>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">Select Video or Image</label>
              <input 
                type="file" 
                className="input-field" 
                accept="video/*,image/*"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>
            
            {file && (
              <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Preview:</p>
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                ) : file.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(file)} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                ) : null}
              </div>
            )}

            <button type="submit" className={`btn-primary ${uploading ? 'loading' : ''}`} disabled={uploading}>
              {uploading ? 'Uploading to Cloud...' : 'Upload Media'}
            </button>
          </form>
        </div>

        {/* Media Gallery */}
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Your Assets ({media.length})</h2>
          {media.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Your library is empty. Upload some media to get started!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
              {media.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedAsset(item)}
                  style={{ 
                    background: 'rgba(0,0,0,0.05)', 
                    borderRadius: '8px', 
                    padding: '0.5rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {item.type === 'IMAGE' ? (
                    <img src={item.publicUrl} alt={item.filename} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <video src={item.publicUrl} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={item.filename}>
                      {item.filename}
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === item.id && (
                        <div style={{
                          position: 'absolute', right: 0, bottom: '100%',
                          background: '#ffffff',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          zIndex: 10,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          minWidth: '120px'
                        }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
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

      </div>

      {/* Full-size Asset Modal */}
      {selectedAsset && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedAsset(null)}>
          <div 
            style={{
              background: '#ffffff',
              border: '1px solid var(--glass-border)',
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '90%',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Asset Preview</h2>
              <button 
                onClick={() => setSelectedAsset(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}
              >
                &times;
              </button>
            </div>
            
            {selectedAsset.type === 'IMAGE' ? (
              <img src={selectedAsset.publicUrl} alt={selectedAsset.filename} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }} />
            ) : (
              <video src={selectedAsset.publicUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }} />
            )}
            
            <div style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong>Filename:</strong> {selectedAsset.filename} <br/>
              <strong>Type:</strong> {selectedAsset.type} <br/>
              {selectedAsset.durationSeconds > 0 && <span><strong>Duration:</strong> {selectedAsset.durationSeconds}s</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
