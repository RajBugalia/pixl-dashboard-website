export default function ScreenCard({ screen }) {
  const isOnline = screen.status === 'ONLINE';

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{screen.name}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Code: {screen.pairingCode}</p>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.35rem', 
          background: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isOnline ? '#4ade80' : '#f87171',
          padding: '0.25rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: isOnline ? '#4ade80' : '#f87171',
            boxShadow: `0 0 8px ${isOnline ? '#4ade80' : '#f87171'}`
          }} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current Campaign</p>
        <p style={{ fontWeight: 500 }}>{screen.campaign ? screen.campaign.name : 'None (Default Default)'}</p>
      </div>

      <button className="btn-secondary" style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.9rem' }}>
        Manage Screen
      </button>
    </div>
  );
}
