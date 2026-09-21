'use client';
import { useState, useEffect } from 'react';
import client from '@/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

  const barData = [
    { name: 'Admins', value: stats.totalAdmins, color: '#3B82F6' },
    { name: 'Total Screens', value: stats.totalScreens, color: '#64748B' },
    { name: 'Active Screens', value: stats.activeScreens, color: '#10B981' },
    { name: 'Campaigns', value: stats.totalCampaigns, color: '#F59E0B' }
  ];

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
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #10B981' }}>
          <span className="stat-value" style={{ color: '#10B981', background: 'none', WebkitTextFillColor: 'initial' }}>{stats.activeScreens}</span>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Overview</h2>
          </div>
          
          <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Master Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/master/pair" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Pair New Screen
            </Link>
            <Link href="/master/screens" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              View Network Screens
            </Link>
            <Link href="/master/admins" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Manage Admins
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
