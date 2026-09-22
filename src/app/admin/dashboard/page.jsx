'use client';
import { useState, useEffect } from 'react';
import client from '@/api/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

  const pieData = [
    { name: 'Active Screens', value: activeScreens },
    { name: 'Inactive Screens', value: inactiveScreens }
  ];
  const COLORS = ['#10B981', '#EF4444'];

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
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #10B981' }}>
          <span className="stat-value" style={{ color: '#10B981', background: 'none', WebkitTextFillColor: 'initial' }}>{activeScreens}</span>
          <span className="stat-label">Active Screens</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <span className="stat-value" style={{ color: '#EF4444', background: 'none', WebkitTextFillColor: 'initial' }}>{inactiveScreens}</span>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Screen Status Distribution</h2>
          </div>
          
          <div style={{ height: '300px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {totalScreens > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                No screens available to display.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/admin/campaigns" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Launch New Campaign
            </Link>
            <Link href="/admin/playlists" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Create Playlist
            </Link>
            <Link href="/admin/media" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Upload Media
            </Link>
            <Link href="/admin/screens" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              View All Screens
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
