'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import client from '@/api/client';

export default function Register() {
  const [role, setRole] = useState('admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await client.post('/auth/signup', {
        name,
        email,
        passwordHash: password,
        role: role.toUpperCase()
      });
      // Registration successful, go to login
      router.push('/login');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Create an Account</h2>

        {errorMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '1.5rem', color: '#ef4444' }}>
            {errorMsg}
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <div className="radio-group" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
            <label className="radio-label">
              <input 
                type="radio" 
                name="role" 
                value="admin" 
                checked={role === 'admin'}
                onChange={() => setRole('admin')}
              />
              Admin Panel
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="role" 
                value="master" 
                checked={role === 'master'}
                onChange={() => setRole('master')}
              />
              Master Panel
            </label>
          </div>

          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter your name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Create a password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Register
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-color)', fontWeight: 500 }}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
