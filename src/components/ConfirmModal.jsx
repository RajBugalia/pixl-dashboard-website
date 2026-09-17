import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '400px',
        padding: '2rem',
        borderRadius: '16px',
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <button 
          onClick={onCancel}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <AlertTriangle size={32} color="#ef4444" />
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#000' }}>
          {title || "Confirm Action"}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message || "Are you sure you want to proceed? This action cannot be undone."}
        </p>

        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
          <button 
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px',
              border: '1px solid var(--border-color)', background: 'transparent',
              color: '#000', fontWeight: '500', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px',
              border: 'none', background: '#ef4444',
              color: '#000', fontWeight: '500', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            Yes, Delete
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
