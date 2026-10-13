'use client';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Tv,
  Users,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Sparkles,
  ArrowUpRight,
  Monitor,
  Layers,
  ShieldCheck,
  Copy,
  Check,
  Radio
} from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import client from '@/api/client';

function PairScreenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pairingCode, setPairingCode] = useState(() => searchParams?.get('code') || '');
  const [screenName, setScreenName] = useState(() => searchParams?.get('screenName') || '');
  const [adminEmail, setAdminEmail] = useState(() => searchParams?.get('admin') || '');

  const [screens, setScreens] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [screenRes, adminRes] = await Promise.allSettled([
        client.get('/master/screens'),
        client.get('/master/admins')
      ]);

      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
      if (adminRes.status === 'fulfilled' && Array.isArray(adminRes.value?.data)) {
        setAdmins(adminRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching pair page dependencies:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Dynamic Telemetry (Real Data Only — Zero Hardware Telemetry)
  const metrics = useMemo(() => {
    const totalScreens = screens.length;
    const onlineScreens = screens.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length;
    const unassignedScreens = screens.filter(s => !s.assignedAdmin || s.assignedAdmin === 'Unassigned');
    const totalAdmins = admins.length;
    const onlineRate = totalScreens > 0 ? Math.round((onlineScreens / totalScreens) * 100) : 100;

    return {
      totalScreens,
      onlineScreens,
      unassignedCount: unassignedScreens.length,
      unassignedScreens,
      totalAdmins,
      onlineRate
    };
  }, [screens, admins]);

  const handlePair = async (e) => {
    e.preventDefault();
    if (!pairingCode.trim()) {
      Swal.fire({ icon: 'warning', title: 'Pairing Code Required', text: 'Please enter the 6-digit code shown on the screen.' });
      return;
    }
    if (!adminEmail.trim()) {
      Swal.fire({ icon: 'warning', title: 'Admin Required', text: 'Please select or enter the tenant admin email.' });
      return;
    }

    setIsSubmitting(true);
    try {
      Swal.fire({
        title: 'Authorizing Hardware Pair...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await client.post('/master/pair-screen', {
        pairingCode: pairingCode.trim(),
        screenName: screenName.trim(),
        adminEmail: adminEmail.trim()
      });

      Swal.fire({
        icon: 'success',
        title: 'Screen Paired & Activated!',
        text: res.data?.message || `Screen successfully assigned to ${adminEmail.trim()}.`,
        timer: 2000,
        showConfirmButton: false
      });

      setPairingCode('');
      setScreenName('');
      await loadData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Pairing Failed',
        text: err.response?.data?.message || 'Invalid pairing code or admin email not found.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Hardware Pairing Engine...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Operational Matrix Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HARDWARE ONBOARDING • DISPLAY NODE ACTIVATION GATEWAY
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Pair New Screen</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#DCFCE7',
              color: '#15803D',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {metrics.unassignedCount} Screens In Available Pool
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: '#DBEAFE',
              color: '#1D4ED8',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {metrics.totalAdmins} Tenant Accounts
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Bind new Android TV, WebOS, or Raspberry Pi player displays to your fleet and delegate management to a tenant admin.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Reload Fleet Data"
            style={{
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.88rem',
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link
            href="/master/screens"
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              fontSize: '0.88rem',
              textDecoration: 'none',
              background: '#ffffff',
              border: '1px solid #CBD5E1',
              borderRadius: '8px'
            }}
          >
            <Monitor size={16} />
            <span>View All Screens</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric Telemetry Cards (Real Data Only — Zero Hardware Telemetry) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Available Pool */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Available To Pair
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <KeyRound size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.unassignedCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Unassigned displays awaiting activation
          </div>
        </div>

        {/* Card 2: Registered Tenants */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tenant Admins
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <Users size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalAdmins}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Available targets for screen delegation
          </div>
        </div>

        {/* Card 3: Total Network Displays */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Fleet Displays
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <Tv size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalScreens}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>{metrics.onlineScreens} Online</span>
            <span>•</span>
            <span>{metrics.totalScreens - metrics.onlineScreens} Offline</span>
          </div>
        </div>

        {/* Card 4: Fleet Health Rate */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Fleet Online Rate
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.onlineRate}%
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Hardware displays operational
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Pairing Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column (7 cols): Pairing Form */}
        <div style={{ gridColumn: 'span 12', lg: 'span 7' }}>
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                background: '#EFF6FF',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Pairing Authorization Form
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Authorize display connection code and bind to an admin account
                </p>
              </div>
            </div>

            <form onSubmit={handlePair} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Screen Name */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 600 }}>
                  Display Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Central Station LED Wall A"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  A human-readable label to identify this physical display in campaigns and telemetry.
                </span>
              </div>

              {/* Pairing Code */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 600 }}>
                  6-Digit Hardware Pairing Code *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 123456"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    maxLength={10}
                    required
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase'
                    }}
                  />
                  <KeyRound size={18} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.6 }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The 6-digit cryptographic registration code shown on the Android TV player screen upon launch.
                </span>
              </div>

              {/* Assign to Admin */}
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" style={{ fontWeight: 600, margin: 0 }}>
                    Assign to Tenant Admin (Email) *
                  </label>
                  {admins.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>
                      {admins.length} registered admins available
                    </span>
                  )}
                </div>

                {admins.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <select
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="input-field"
                      required
                      style={{ fontSize: '0.9rem' }}
                    >
                      <option value="">-- Select an Admin Account --</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.email}>
                          {a.name} ({a.email})
                        </option>
                      ))}
                    </select>

                    <input
                      type="email"
                      className="input-field"
                      placeholder="Or enter custom admin email..."
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                ) : (
                  <input
                    type="email"
                    className="input-field"
                    placeholder="admin@enterprise.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                  />
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  The tenant administrator who will schedule playlists and broadcast campaigns to this display.
                </span>
              </div>

              {/* Submit CTA */}
              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !pairingCode.trim() || !adminEmail.trim()}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: (isSubmitting || !pairingCode.trim() || !adminEmail.trim()) ? 0.6 : 1,
                    cursor: (isSubmitting || !pairingCode.trim() || !adminEmail.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Sparkles size={18} />
                  <span>{isSubmitting ? 'Authenticating & Authorizing...' : 'Authorize & Pair Screen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Available Screens Queue & Instructions */}
        <div style={{ gridColumn: 'span 12', lg: 'span 5', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick-Pick Unassigned Screens Queue */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Available Displays ({metrics.unassignedCount})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Click to auto-populate pairing code &amp; name
                </span>
              </div>
              <span style={{
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                background: '#FEF3C7',
                color: '#B45309',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                Pool Queue
              </span>
            </div>

            {metrics.unassignedCount === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={24} style={{ color: '#16A34A', margin: '0 auto 0.5rem' }} />
                <span>All screens in fleet are currently assigned to tenant admins.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                {metrics.unassignedScreens.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setPairingCode(s.pairingCode || '');
                      setScreenName(s.name || '');
                    }}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: pairingCode === s.pairingCode ? '#EFF6FF' : '#F8FAFC',
                      border: pairingCode === s.pairingCode ? '1px solid var(--accent-color)' : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Code: <strong style={{ color: 'var(--text-primary)' }}>{s.pairingCode}</strong> • {s.location || 'Location Not Set'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(s.pairingCode);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedCode === s.pairingCode ? '#16A34A' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                      title="Copy pairing code"
                    >
                      {copiedCode === s.pairingCode ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Android TV Pairing Guide Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                How Hardware Pairing Works
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                  1
                </span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Launch PixL TV App:</strong> Open the signage player app on the Android TV, WebOS, or Raspberry Pi player.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                  2
                </span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Obtain 6-Digit Code:</strong> The TV screen will display a temporary cryptographic pairing key (e.g. <code>123456</code>).
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                  3
                </span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Bind &amp; Broadcast:</strong> Enter the code above and select the regional admin. The TV screen connects instantly and starts displaying scheduled campaigns.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PairScreen() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Pairing Interface...</p>
      </div>
    }>
      <PairScreenContent />
    </Suspense>
  );
}
