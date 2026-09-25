'use client';
import { useState, useEffect } from 'react';
import { Save, User, Lock, Bell, Settings } from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({ 
    name: '', email: '', theme: 'light', timezone: 'UTC', 
    notifyAlerts: true, notifyReports: true, notifyUpdates: false 
  });
  const [loading, setLoading] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await client.get('/user/me');
      setUser(res.data);
      // Update local storage so Navbar name updates
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, name: res.data.name }));
      
      // Dispatch custom event to trigger navbar update immediately
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error fetching profile:', err);
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.name || storedUser.email) {
        setUser(prev => ({
          ...prev,
          name: storedUser.name || prev.name,
          email: storedUser.email || prev.email
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (activeTab === 'security') {
        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.fire('Error', 'Please fill all password fields', 'error');
          return;
        }
        if (newPassword !== confirmPassword) {
          Swal.fire('Error', 'New passwords do not match', 'error');
          return;
        }
        await client.put('/user/password', {
          currentPassword,
          newPassword
        });
        Swal.fire({ title: 'Password Updated', icon: 'success', timer: 2000, showConfirmButton: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // Save Profile, Notifications, or System
        await client.put('/user/profile', {
          name: user.name,
          theme: user.theme,
          timezone: user.timezone,
          notifyAlerts: user.notifyAlerts,
          notifyReports: user.notifyReports,
          notifyUpdates: user.notifyUpdates
        });
        
        // Update local storage so Navbar name updates immediately
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, name: user.name }));
        
        // Dispatch custom event to trigger navbar update
        window.dispatchEvent(new Event('storage'));

        Swal.fire({
          title: 'Settings Saved',
          text: 'Your preferences have been updated successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to update settings', 'error');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Settings...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Settings Navigation Sidebar */}
        <div className="glass-panel" style={{ padding: '1.5rem 1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                background: activeTab === 'profile' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: 'none', textAlign: 'left', fontWeight: activeTab === 'profile' ? '600' : '500',
                transition: 'all 0.2s'
              }}
            >
              <User size={18} /> Profile Details
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                background: activeTab === 'security' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                color: activeTab === 'security' ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: 'none', textAlign: 'left', fontWeight: activeTab === 'security' ? '600' : '500',
                transition: 'all 0.2s'
              }}
            >
              <Lock size={18} /> Security
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                background: activeTab === 'notifications' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                color: activeTab === 'notifications' ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: 'none', textAlign: 'left', fontWeight: activeTab === 'notifications' ? '600' : '500',
                transition: 'all 0.2s'
              }}
            >
              <Bell size={18} /> Notifications
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                background: activeTab === 'system' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                color: activeTab === 'system' ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: 'none', textAlign: 'left', fontWeight: activeTab === 'system' ? '600' : '500',
                transition: 'all 0.2s'
              }}
            >
              <Settings size={18} /> System Preferences
            </button>
          </div>
        </div>

        {/* Settings Content Area */}
        <div className="glass-panel">
          <form onSubmit={handleSave}>
            {activeTab === 'profile' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  Profile Information
                </h2>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="input-field" value={user.name} onChange={(e) => setUser({...user, name: e.target.value})} placeholder="Your Name" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input type="email" className="input-field" value={user.email} disabled style={{ background: '#F1F5F9' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email address cannot be changed.</span>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  Change Password
                </h2>
                <div className="input-group">
                  <label className="input-label">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field" placeholder="••••••••" required />
                </div>
                <div className="input-group">
                  <label className="input-label">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="••••••••" required />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  Email Notifications
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={user.notifyAlerts} onChange={(e) => setUser({...user, notifyAlerts: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>System Alerts</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get notified when screens go offline.</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={user.notifyReports} onChange={(e) => setUser({...user, notifyReports: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Campaign Reports</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive weekly proof of play analytics.</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={user.notifyUpdates} onChange={(e) => setUser({...user, notifyUpdates: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Marketing Updates</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive updates on new features.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  Appearance & Preferences
                </h2>
                <div className="input-group">
                  <label className="input-label">Theme Mode</label>
                  <select className="input-field" value={user.theme} onChange={(e) => setUser({...user, theme: e.target.value})}>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode (Coming Soon)</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Timezone</label>
                  <select className="input-field" value={user.timezone} onChange={(e) => setUser({...user, timezone: e.target.value})}>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="EST">Eastern Standard Time</option>
                    <option value="PST">Pacific Standard Time</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
