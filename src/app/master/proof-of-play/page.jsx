'use client';
import { useState, useEffect } from 'react';

import client from '@/api/client';

export default function MasterProofOfPlay() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/master/proof-of-play')
      .then(res => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Network Analytics (Proof of Play)</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>View global playback logs across all network screens.</p>
      </div>

      {loading ? (
        <p>Loading analytics...</p>
      ) : logs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No playback logs found on the network.
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Screen</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Owner</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Campaign</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Media</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Preview</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Duration</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Played At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{log.screenName}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent)' }}>{log.adminEmail}</td>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#334155' }}>{log.campaignName}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{log.mediaName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{log.mediaType}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {log.mediaType.startsWith('image') ? (
                      <img src={log.mediaUrl} alt="preview" style={{width: 80, height: 45, objectFit: 'cover', borderRadius: '4px'}} />
                    ) : (
                      <video src={log.mediaUrl} style={{width: 80, height: 45, objectFit: 'cover', borderRadius: '4px'}} muted />
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>{log.duration}s</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      background: log.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: log.status === 'COMPLETED' ? '#16a34a' : '#ef4444',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>{log.status}</span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(log.playedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
