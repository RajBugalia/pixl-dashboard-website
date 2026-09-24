'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, FolderPlus, Tag, X } from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function AdminScreens() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const loadScreens = () => {
    client.get('/admin/screens')
      .then(res => {
        setScreens(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadScreens();
  }, []);

  // Compute distinct groups
  const existingGroups = Array.from(
    new Set(screens.map(s => s.groupName).filter(Boolean))
  );

  const handleAssignGroup = (screen) => {
    setActiveMenuId(null);

    const groupOptionsHtml = existingGroups.length > 0
      ? `<div style="margin-bottom: 1rem; text-align: left;">
           <label style="font-size: 0.85rem; color: #6b7280; font-weight: 500;">Select an existing group or type a new one below:</label>
           <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
             ${existingGroups.map(g => `<button type="button" class="swal-group-chip" data-group="${g}" style="padding: 0.35rem 0.75rem; border-radius: 9999px; border: 1px solid #d1d5db; background: #f9fafb; font-size: 0.85rem; cursor: pointer; transition: all 0.15s;">🏷️ ${g}</button>`).join('')}
           </div>
         </div>`
      : '';

    Swal.fire({
      title: 'Assign Group / Location',
      html: `
        <p style="font-size: 0.9rem; color: #6b7280; margin-bottom: 1rem;">
          Organize <strong>"${screen.name}"</strong> by city or location (e.g., Delhi, Mumbai Airport, Ground Floor).
        </p>
        ${groupOptionsHtml}
        <input id="swal-group-input" class="swal2-input" placeholder="Enter group name" value="${screen.groupName || ''}" style="margin: 0.5rem auto 0 auto; width: 100%; box-sizing: border-box;" />
      `,
      showCancelButton: true,
      showDenyButton: !!screen.groupName,
      confirmButtonText: 'Save Group',
      denyButtonText: 'Remove from Group',
      confirmButtonColor: '#2563EB',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      didOpen: () => {
        const input = document.getElementById('swal-group-input');
        document.querySelectorAll('.swal-group-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            if (input) input.value = chip.getAttribute('data-group');
          });
        });
      },
      preConfirm: () => {
        const input = document.getElementById('swal-group-input');
        return input ? input.value.trim() : '';
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const newGroup = result.value;
        try {
          Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.put(`/admin/screens/${screen.id}/group`, { groupName: newGroup || null });
          setScreens(screens.map(s => s.id === screen.id ? { ...s, groupName: newGroup || null } : s));
          Swal.fire({ icon: 'success', title: 'Group Saved', timer: 1200, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Failed to update group' });
        }
      } else if (result.isDenied) {
        try {
          Swal.fire({ title: 'Removing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await client.put(`/admin/screens/${screen.id}/group`, { groupName: null });
          setScreens(screens.map(s => s.id === screen.id ? { ...s, groupName: null } : s));
          Swal.fire({ icon: 'success', title: 'Removed from Group', timer: 1200, showConfirmButton: false });
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Failed to remove group' });
        }
      }
    });
  };

  const handleCreateNewGroup = () => {
    Swal.fire({
      title: 'Create Screen Group',
      text: 'Enter a group name based on city, branch, or location (e.g. "Delhi Hub", "Mumbai Stores")',
      input: 'text',
      inputPlaceholder: 'e.g. Delhi Branch',
      showCancelButton: true,
      confirmButtonText: 'Next',
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#9ca3af',
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Please enter a group name';
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const groupName = result.value.trim();
        // Prompt to select screens for this new group
        const availableScreens = screens;
        if (availableScreens.length === 0) {
          Swal.fire({ icon: 'info', title: 'No screens', text: 'You do not have any screens to assign yet.' });
          return;
        }

        const checkboxesHtml = availableScreens.map(s => `
          <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer; text-align: left;">
            <input type="checkbox" class="swal-screen-checkbox" value="${s.id}" ${s.groupName === groupName ? 'checked' : ''} />
            <span>${s.name} <small style="color: #6b7280;">(${s.groupName ? 'Current: ' + s.groupName : 'Ungrouped'})</small></span>
          </label>
        `).join('');

        Swal.fire({
          title: `Assign Screens to "${groupName}"`,
          html: `<div style="max-height: 250px; overflow-y: auto; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px;">${checkboxesHtml}</div>`,
          showCancelButton: true,
          confirmButtonText: 'Save Group',
          confirmButtonColor: '#2563EB',
          cancelButtonColor: '#9ca3af',
          preConfirm: () => {
            const checkedIds = Array.from(document.querySelectorAll('.swal-screen-checkbox:checked')).map(cb => cb.value);
            return checkedIds;
          }
        }).then(async (selResult) => {
          if (selResult.isConfirmed) {
            Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
              const selectedIds = selResult.value;
              await Promise.all(selectedIds.map(id => client.put(`/admin/screens/${id}/group`, { groupName })));
              loadScreens();
              Swal.fire({ icon: 'success', title: 'Group Created!', text: `Screens assigned to ${groupName}`, timer: 1500, showConfirmButton: false });
            } catch (err) {
              Swal.fire({ icon: 'error', title: 'Failed', text: 'Failed to assign screens to group' });
            }
          }
        });
      }
    });
  };

  // Filtered screens
  const filteredScreens = screens.filter(s => {
    if (selectedGroupFilter === 'ALL') return true;
    if (selectedGroupFilter === 'UNGROUPED') return !s.groupName;
    return s.groupName === selectedGroupFilter;
  });

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>My Screens</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage and group your connected displays by city or location.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-secondary" 
            style={{ width: 'auto', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleCreateNewGroup}
          >
            <FolderPlus size={18} /> New Group
          </button>
          <button 
            className="btn-primary" 
            style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
            onClick={() => Swal.fire({
              icon: 'info',
              title: 'Add Screen',
              text: 'To add a new screen, please ask your Master Administrator to pair a screen and assign it to your email address.',
              confirmButtonColor: '#2563EB'
            })}
          >
            Add Screen
          </button>
        </div>
      </div>

      {/* Group Filter Tabs */}
      {screens.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginRight: '0.25rem' }}>
            Filter:
          </span>
          <button
            onClick={() => setSelectedGroupFilter('ALL')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 500,
              border: selectedGroupFilter === 'ALL' ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)',
              background: selectedGroupFilter === 'ALL' ? 'var(--accent-color)' : '#ffffff',
              color: selectedGroupFilter === 'ALL' ? '#ffffff' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All Screens ({screens.length})
          </button>

          {existingGroups.map(grp => {
            const count = screens.filter(s => s.groupName === grp).length;
            const isSelected = selectedGroupFilter === grp;
            return (
              <button
                key={grp}
                onClick={() => setSelectedGroupFilter(grp)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)',
                  background: isSelected ? 'var(--accent-color)' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                🏷️ {grp} ({count})
              </button>
            );
          })}

          <button
            onClick={() => setSelectedGroupFilter('UNGROUPED')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 500,
              border: selectedGroupFilter === 'UNGROUPED' ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)',
              background: selectedGroupFilter === 'UNGROUPED' ? 'var(--accent-color)' : '#ffffff',
              color: selectedGroupFilter === 'UNGROUPED' ? '#ffffff' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Ungrouped ({screens.filter(s => !s.groupName).length})
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading screens...</p>
        </div>
      ) : screens.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No screens assigned to you yet. Ask the Master Panel to pair a screen to your email.
        </div>
      ) : filteredScreens.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No screens match the selected filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredScreens.map(screen => (
            <div key={screen.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{screen.name}</h2>
                  <div style={{ marginTop: '0.35rem' }}>
                    {screen.groupName ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe'
                      }}>
                        🏷️ {screen.groupName}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        background: '#f3f4f6',
                        color: '#6b7280'
                      }}>
                        Ungrouped
                      </span>
                    )}
                  </div>
                </div>

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
                      title="Screen Options"
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
                        minWidth: '160px'
                      }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAssignGroup(screen); }}
                          style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'none', border: 'none',
                            color: 'var(--text-primary)', cursor: 'pointer',
                            padding: '0.5rem', borderRadius: '4px',
                            textAlign: 'left', fontSize: '0.85rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <Tag size={15} /> {screen.groupName ? 'Change Group' : 'Assign to Group'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                📍 {screen.location || 'Location Not Specified'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'auto', paddingTop: '0.75rem' }}>
                🔑 Pairing Code: <strong style={{ color: 'var(--text-primary)' }}>{screen.pairingCode}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
