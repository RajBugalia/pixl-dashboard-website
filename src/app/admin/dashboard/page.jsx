'use client';
import { useState, useEffect } from 'react';
import client from '@/api/client';
import Link from 'next/link';

export default function AdminDashboard() {
  const [screens, setScreens] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/admin/screens'),
      client.get('/campaigns')
    ])
    .then(([screenRes, campRes]) => {
      setScreens(screenRes.data);
      setCampaigns(campRes.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading Dashboard...</p>;

  const totalScreens = screens.length;
  const activeScreens = screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length;
  const inactiveScreens = totalScreens - activeScreens;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-panel stat-card">
          <span className="stat-value">{totalScreens}</span>
          <span className="stat-label">Total Screens</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <span className="stat-value">{activeScreens}</span>
          <span className="stat-label">Active Screens</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span className="stat-value">{inactiveScreens}</span>
          <span className="stat-label">Inactive Screens</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-value">{campaigns.length}</span>
          <span className="stat-label">Total Campaigns</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Active Screens</h2>
            <Link href="/admin/screens" style={{ color: 'var(--accent)', fontSize: '0.9rem', textDecoration: 'none' }}>
              View All &rarr;
            </Link>
          </div>
          
          {activeScreens === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No active screens currently running.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').map(screen => (
                <div key={screen.id} style={{ background: 'rgba(0, 0, 0,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{screen.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{screen.location}</p>
                  </div>
                  <div style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#16a34a', fontSize: '0.8rem' }}>
                    Online
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/admin/campaigns" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Launch New Campaign
            </Link>
            <Link href="/admin/playlists" className="btn-primary" style={{ background: 'var(--surface-light)', textAlign: 'center', textDecoration: 'none' }}>
              Create Playlist
            </Link>
            <Link href="/admin/media" className="btn-primary" style={{ background: 'var(--surface-light)', textAlign: 'center', textDecoration: 'none' }}>
              Upload Media
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
