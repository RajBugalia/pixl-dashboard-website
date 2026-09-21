'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import client from '@/api/client';

export default function Login() {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await client.post('/auth/signin', {
        email,
        passwordHash: password
      });
      
      const { token, id, email: userEmail, role: backendRole } = response.data;
      
      // Check permissions based on selected radio button
      if (role === 'master') {
        if (backendRole !== 'ROLE_MASTER') {
          setError('Access denied: You do not have Master Panel privileges.');
          setIsLoading(false);
          return;
        }
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ id, email: userEmail, role: backendRole }));
        router.push('/master/dashboard');
      } else {
        if (backendRole !== 'ROLE_ADMIN' && backendRole !== 'ROLE_MASTER') {
          setError('Access denied: You do not have Admin Panel privileges.');
          setIsLoading(false);
          return;
        }
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ id, email: userEmail, role: backendRole }));
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Welcome to PixL</h2>
        
        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '1.5rem', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
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
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={`btn-primary ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            Sign In
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--accent-color)', fontWeight: 500 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
