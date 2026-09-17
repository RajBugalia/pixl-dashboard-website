'use client';
import { useState, useEffect } from 'react';
import client from '@/api/client';
import Link from 'next/link';

export default function MasterDashboard() {
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/master/stats'),
      client.get('/master/admins')
    ])
    .then(([statsRes, adminsRes]) => {
      setStats(statsRes.data);
      setAdmins(adminsRes.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <p>Loading Dashboard...</p>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Master Dashboard</h1>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-panel stat-card">
          <span className="stat-value">{stats.totalAdmins}</span>
          <span className="stat-label">Total Admins</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-value">{stats.totalScreens}</span>
          <span className="stat-label">Total Screens</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <span className="stat-value">{stats.activeScreens}</span>
          <span className="stat-label">Active Screens</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-value">{stats.totalCampaigns}</span>
          <span className="stat-label">Total Campaigns</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Recent Admins</h2>
            <Link href="/master/admins" style={{ color: 'var(--accent)', fontSize: '0.9rem', textDecoration: 'none' }}>
              Manage Admins &rarr;
            </Link>
          </div>
          
          {admins.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No admins registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {admins.slice(0, 5).map(admin => (
                <div key={admin.id} style={{ background: 'rgba(0, 0, 0,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{admin.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{admin.email}</p>
                  </div>
                  <div style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(0, 0, 0,0.1)', fontSize: '0.8rem' }}>
                    {admin.role}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Master Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/master/pair" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Pair New Screen
            </Link>
            <Link href="/master/screens" className="btn-primary" style={{ background: 'var(--surface-light)', textAlign: 'center', textDecoration: 'none' }}>
              View Network Screens
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
