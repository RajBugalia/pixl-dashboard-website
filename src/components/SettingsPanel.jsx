'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Save,
  User,
  Lock,
  Bell,
  Settings as SettingsIcon,
  Shield,
  RotateCw,
  CheckCircle2,
  Tv,
  Globe,
  Sliders,
  Sparkles,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import client from '@/api/client';

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({
    name: '',
    email: '',
    role: '',
    theme: 'light',
    timezone: 'UTC',
    notifyAlerts: true,
    notifyReports: true,
    notifyUpdates: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await client.get('/user/me');
      if (res.data) {
        setUser(res.data);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, name: res.data.name }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.name || storedUser.email) {
        setUser(prev => ({
          ...prev,
          name: storedUser.name || prev.name,
          email: storedUser.email || prev.email,
          role: storedUser.role || prev.role
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (activeTab === 'security') {
        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.fire({ icon: 'warning', title: 'Missing Password', text: 'Please fill in all password fields.' });
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          Swal.fire({ icon: 'warning', title: 'Passwords Mismatch', text: 'New password and confirmation do not match.' });
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          Swal.fire({ icon: 'warning', title: 'Password Too Short', text: 'Password must be at least 6 characters long.' });
          setSaving(false);
          return;
        }

        await client.put('/user/password', {
          currentPassword,
          newPassword
        });

        Swal.fire({
          title: 'Password Updated!',
          text: 'Your security credentials have been updated successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
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

        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, name: user.name }));
        window.dispatchEvent(new Event('storage'));

        Swal.fire({
          title: 'Settings Saved',
          text: 'Your preferences have been updated successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.response?.data?.message || err.response?.data?.error || 'Failed to update settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const isMasterRole = user.role === 'ROLE_MASTER';

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Settings &amp; Preferences...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Operational Matrix Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HQ SYSTEM CONFIGURATION • {isMasterRole ? 'MASTER ENTERPRISE' : 'TENANT ADMIN'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Settings &amp; Preferences</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: isMasterRole ? '#F3E8FF' : '#DBEAFE',
              color: isMasterRole ? '#7E22CE' : '#1D4ED8',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {isMasterRole ? 'Master Controller' : 'Tenant Administrator'}
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#DCFCE7',
              color: '#15803D',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              Profile Verified
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Manage profile credentials, account security, dispatch notification channels, and global player engine preferences.
          </p>
        </div>

        <button
          onClick={fetchProfile}
          className="btn-secondary"
          title="Reload Settings"
          style={{
            padding: '0.5rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.88rem',
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <RotateCw size={16} />
          <span>Reload</span>
        </button>
      </div>

      {/* 2. Top Metric Telemetry Cards (Real Data Only — Zero Hardware Telemetry) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Identity */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Identity
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <User size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name || 'Signage Operator'}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </div>
        </div>

        {/* Card 2: Security Health */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Security Status
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
            JWT Protected
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Cryptographic authentication enabled
          </div>
        </div>

        {/* Card 3: Alert Channels */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Dispatch Alerts
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <Bell size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {user.notifyAlerts ? 'Active' : 'Muted'}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {user.notifyReports ? 'Weekly reports subscribed' : 'Standard event notifications'}
          </div>
        </div>

        {/* Card 4: Region & Timezone */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Display Timezone
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE' }}>
              <Globe size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {user.timezone || 'UTC'}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Playback schedule alignment
          </div>
        </div>
      </div>

      {/* 3. Settings Navigation Tabs & Form Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Settings Sidebar Tabs (3.5 cols on large) */}
        <div style={{ gridColumn: 'span 12', lg: 'span 4' }}>
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: activeTab === 'profile' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'profile' ? 'var(--accent-color)' : 'var(--text-primary)',
                border: activeTab === 'profile' ? '1px solid #DBEAFE' : '1px solid transparent',
                textAlign: 'left',
                fontWeight: activeTab === 'profile' ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.15s ease'
              }}
            >
              <User size={18} />
              <span>Profile Information</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: activeTab === 'security' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'security' ? 'var(--accent-color)' : 'var(--text-primary)',
                border: activeTab === 'security' ? '1px solid #DBEAFE' : '1px solid transparent',
                textAlign: 'left',
                fontWeight: activeTab === 'security' ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Lock size={18} />
              <span>Security &amp; Password</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: activeTab === 'notifications' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'notifications' ? 'var(--accent-color)' : 'var(--text-primary)',
                border: activeTab === 'notifications' ? '1px solid #DBEAFE' : '1px solid transparent',
                textAlign: 'left',
                fontWeight: activeTab === 'notifications' ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Bell size={18} />
              <span>Dispatch Notifications</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: activeTab === 'system' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'system' ? 'var(--accent-color)' : 'var(--text-primary)',
                border: activeTab === 'system' ? '1px solid #DBEAFE' : '1px solid transparent',
                textAlign: 'left',
                fontWeight: activeTab === 'system' ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.15s ease'
              }}
            >
              <SettingsIcon size={18} />
              <span>System &amp; Region</span>
            </button>
          </div>
        </div>

        {/* Right Settings Form Area (8 cols on large) */}
        <div style={{ gridColumn: 'span 12', lg: 'span 8' }}>
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Tab 1: Profile Information */}
              {activeTab === 'profile' && (
                <div>
                  <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Personal Profile Details
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                      Update display name and view account role permissions
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Full Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={user.name}
                        onChange={(e) => setUser({ ...user, name: e.target.value })}
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Email Address</label>
                      <input
                        type="email"
                        className="input-field"
                        value={user.email}
                        disabled
                        style={{ background: '#F8FAFC', color: 'var(--text-secondary)' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Registered account identifier cannot be altered directly. Contact administrator if needed.
                      </span>
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Assigned Role</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          background: isMasterRole ? '#F3E8FF' : '#DBEAFE',
                          color: isMasterRole ? '#7E22CE' : '#1D4ED8',
                          fontSize: '0.82rem',
                          fontWeight: 700
                        }}>
                          {user.role || 'ROLE_ADMIN'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {isMasterRole ? 'Full enterprise matrix clearance' : 'Tenant fleet and broadcast privileges'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Security & Password */}
              {activeTab === 'security' && (
                <div>
                  <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Security Credentials
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                      Change your password and maintain cryptographic session safety
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Current Password *</label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>New Password *</label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Confirm New Password *</label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Dispatch Notifications */}
              {activeTab === 'notifications' && (
                <div>
                  <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Notification Preferences
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                      Select which operational alerts and summaries are dispatched to you
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <input
                        type="checkbox"
                        checked={user.notifyAlerts}
                        onChange={(e) => setUser({ ...user, notifyAlerts: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: 'var(--accent-color)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>Hardware Disconnect Alerts</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Receive immediate alerts when displays drop offline or fail heartbeat verification.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <input
                        type="checkbox"
                        checked={user.notifyReports}
                        onChange={(e) => setUser({ ...user, notifyReports: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: 'var(--accent-color)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>Proof of Play Delivery Reports</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Receive weekly digest summarizing airtime compliance and completed broadcasts.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <input
                        type="checkbox"
                        checked={user.notifyUpdates}
                        onChange={(e) => setUser({ ...user, notifyUpdates: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: 'var(--accent-color)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>Platform Feature Updates</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Receive notices when new scheduling features and player APK updates are published.</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 4: System & Region */}
              {activeTab === 'system' && (
                <div>
                  <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      System &amp; Regional Preferences
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                      Configure interface theme and global broadcast synchronization timezone
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Interface Appearance</label>
                      <select
                        className="input-field"
                        value={user.theme || 'light'}
                        onChange={(e) => setUser({ ...user, theme: e.target.value })}
                      >
                        <option value="light">Pristine Light Theme (Default)</option>
                        <option value="dark">Dark Theme</option>
                        <option value="system">Follow Operating System</option>
                      </select>
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontWeight: 600 }}>Playback Timezone</label>
                      <select
                        className="input-field"
                        value={user.timezone || 'UTC'}
                        onChange={(e) => setUser({ ...user, timezone: e.target.value })}
                      >
                        <option value="UTC">UTC (Universal Coordinated Time)</option>
                        <option value="EST">EST (Eastern Standard Time)</option>
                        <option value="CST">CST (Central Standard Time)</option>
                        <option value="PST">PST (Pacific Standard Time)</option>
                        <option value="GMT">GMT (Greenwich Mean Time)</option>
                        <option value="IST">IST (Indian Standard Time)</option>
                      </select>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Campaign start and end dayparts align to this local timezone.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '0.65rem 1.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving Preferences...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
