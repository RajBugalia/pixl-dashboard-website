'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import client from '@/api/client';
import { signIn, loginErrorMessage } from '@/api/login.mjs';
import {
  Monitor,
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  AlertCircle,
  X
} from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const submitting = useRef(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError('');
    setIsLoading(true);

    try {
      const destination = await signIn({
        client,
        storage: window.localStorage,
        email,
        password,
        panel: role
      });
      router.replace(destination);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-page-wrapper">
      {/* Top Header */}
      <header className="signin-header">
        <div className="signin-brand">
          <div className="signin-brand-icon">
            <Shield size={18} fill="#FFFFFF" />
          </div>
          <div>
            <div className="signin-brand-title">PixL</div>
            <div className="signin-brand-sub">SIGNAGE CLOUD</div>
          </div>
        </div>
      </header>

      {/* Main Form Center */}
      <main className="signin-main-container">
        {/* Card */}
        <div className="signin-card">
          <div className="signin-card-top-icon">
            <Monitor size={26} strokeWidth={2.2} />
          </div>

          <h1 className="signin-heading">Welcome to PixL</h1>
          <p className="signin-subheading">
            Sign in to manage displays, playlists, and campaign broadcasts
          </p>

          {/* Authentication Alert */}
          {error && (
            <div role="alert" className="signin-alert-box">
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div className="signin-alert-content">
                <div className="signin-alert-title">Authentication Alert</div>
                <div className="signin-alert-desc">{error}</div>
              </div>
              <button
                type="button"
                className="signin-alert-close"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Access Scope Toggle */}
            <div className="signin-scope-section">
              <span className="signin-scope-label">ACCESS SCOPE</span>
              <div className="signin-scope-toggle">
                <button
                  type="button"
                  disabled={isLoading}
                  className={`signin-scope-tab ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => setRole('admin')}
                >
                  {role === 'admin' && <Check size={16} strokeWidth={2.5} />}
                  Admin Panel
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  className={`signin-scope-tab ${role === 'master' ? 'active' : ''}`}
                  onClick={() => setRole('master')}
                >
                  {role === 'master' && <Check size={16} strokeWidth={2.5} />}
                  Master Panel
                </button>
              </div>
              <div className="signin-scope-hint">
                {role === 'admin'
                  ? 'Admin accounts manage assigned screens, media assets & campaign schedules.'
                  : 'Master accounts have full system authority, tenant provisioning & network diagnostics.'}
              </div>
            </div>

            {/* Work Email */}
            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="input-label" htmlFor="email" style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                Work Email
              </label>
              <div className="signin-input-wrapper">
                <span className="signin-input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="username"
                  disabled={isLoading}
                  className="signin-input"
                  placeholder="name@pixl.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="input-label" htmlFor="password" style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155', marginBottom: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setError('Please contact your PixL platform master administrator to reset your credentials.')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="signin-input-wrapper">
                <span className="signin-input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="signin-input"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="signin-input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="signin-remember-row">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#2563EB', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ cursor: 'pointer', userSelect: 'none' }}>
                Keep signed in on this controller
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="signin-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In to {role === 'master' ? 'Master Panel' : 'Admin Panel'}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Bottom Card Info */}
          <div className="signin-card-footer">
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
              Don&apos;t have an enterprise account?{' '}
              <Link href="/register" style={{ color: '#2563EB', fontWeight: 600 }}>
                Register here
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#94A3B8' }}>
              <Shield size={13} />
              <span>256-Bit SSL Encrypted Enterprise Signage Cloud</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Copyright */}
      <footer className="signin-copyright">
        © 2025 PixL Digital Signage Cloud Inc. Hardware Infrastructure Orchestration Platform.
      </footer>
    </div>
  );
}
