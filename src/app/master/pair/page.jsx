'use client';
import { useState } from 'react';
import client from '@/api/client';

export default function PairScreen() {
  const [pairingCode, setPairingCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [message, setMessage] = useState(null);

  const handlePair = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await client.post('/master/pair-screen', {
        pairingCode,
        adminEmail
      });
      setMessage({ type: 'success', text: 'Screen successfully paired to admin!' });
      setPairingCode('');
      setAdminEmail('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Pairing failed' });
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Pair New Screen</h1>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          Enter the 6-digit code displayed on the Android TV Player to register the screen to our system, and assign it to an Admin account.
        </p>

        {message && (
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: message.type === 'success' ? '#16a34a' : '#ef4444'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePair}>
          <div className="input-group">
            <label className="input-label">Pairing Code</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. 123456" 
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              maxLength={6}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Assign to Admin (Email)</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="admin@viewo.com" 
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
            Pair & Assign Screen
          </button>
        </form>
      </div>
    </>
  );
}
