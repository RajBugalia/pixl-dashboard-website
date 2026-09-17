'use client';
import { useState, useEffect } from 'react';

import client from '@/api/client';

export default function AdminProofOfPlay() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/proof-of-play')
      .then(res => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Analytics (Proof of Play)</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>View real-time playback logs across your assigned screens.</p>
      </div>

      {loading ? (
        <p>Loading analytics...</p>
      ) : logs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No playback logs found. Make sure your screens are online and playing content.
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Screen Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Media Type</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Preview</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Played At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{log.screenName}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      background: '#f3f4f6',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem'
                    }}>{log.mediaType}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {log.mediaType.startsWith('image') ? (
                      <img src={log.mediaUrl} alt="preview" style={{width: 80, height: 45, objectFit: 'cover', borderRadius: '4px'}} />
                    ) : (
                      <video src={log.mediaUrl} style={{width: 80, height: 45, objectFit: 'cover', borderRadius: '4px'}} muted />
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--accent)' }}>{new Date(log.playedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
