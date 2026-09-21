'use client';
import { useState, useEffect } from 'react';
import { Save, User, Lock, Bell, Settings } from 'lucide-react';
import Swal from 'sweetalert2';

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({ name: '', email: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    Swal.fire({
      title: 'Settings Saved',
      text: 'Your preferences have been updated successfully.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

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
                  <input type="text" className="input-field" defaultValue={user.name} placeholder="Your Name" />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input type="email" className="input-field" defaultValue={user.email} disabled style={{ background: '#F1F5F9' }} />
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
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <div className="input-group">
                  <label className="input-label">New Password</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm New Password</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
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
                    <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>System Alerts</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get notified when screens go offline.</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Campaign Reports</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive weekly proof of play analytics.</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} />
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
                  <select className="input-field">
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode (Coming Soon)</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Timezone</label>
                  <select className="input-field" defaultValue="UTC">
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
