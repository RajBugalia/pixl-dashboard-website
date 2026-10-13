'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Tv,
  Search,
  Trash2,
  MoreVertical,
  X,
  CheckCircle2,
  RotateCw,
  AlertTriangle,
  Mail,
  Lock,
  User,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import client from '@/api/client';

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'

  // Register Admin Modal State
  const [showModal, setShowModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', passwordHash: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [adminRes, screenRes] = await Promise.allSettled([
        client.get('/master/admins'),
        client.get('/master/screens')
      ]);

      if (adminRes.status === 'fulfilled' && Array.isArray(adminRes.value?.data)) {
        setAdmins(adminRes.value.data);
      }
      if (screenRes.status === 'fulfilled' && Array.isArray(screenRes.value?.data)) {
        setScreens(screenRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching admin directory data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Metrics (Real Data Only — Zero Hardware Telemetry)
  const metrics = useMemo(() => {
    const totalAdmins = admins.length;
    const totalScreens = screens.length;

    // Screens assigned to any admin
    const assignedScreensCount = screens.filter(s => s.assignedAdmin && s.assignedAdmin !== 'Unassigned').length;
    const unassignedScreensCount = Math.max(0, totalScreens - assignedScreensCount);

    // Admins with at least 1 screen assigned
    const adminsWithScreens = admins.filter(admin => {
      return screens.some(s => s.assignedAdmin === admin.email);
    }).length;

    const avgScreensPerAdmin = totalAdmins > 0 ? (assignedScreensCount / totalAdmins).toFixed(1) : '0';

    return {
      totalAdmins,
      totalScreens,
      assignedScreensCount,
      unassignedScreensCount,
      adminsWithScreens,
      avgScreensPerAdmin
    };
  }, [admins, screens]);

  // Map of screens per admin email
  const screensByAdminEmail = useMemo(() => {
    const map = {};
    admins.forEach(a => {
      map[a.email] = screens.filter(s => s.assignedAdmin === a.email);
    });
    return map;
  }, [admins, screens]);

  // Filtered Admins
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = admin.name?.toLowerCase().includes(q);
        const matchesEmail = admin.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // Filter Type
      const adminScreens = screensByAdminEmail[admin.email] || [];
      if (filterType === 'ASSIGNED' && adminScreens.length === 0) return false;
      if (filterType === 'UNASSIGNED' && adminScreens.length > 0) return false;

      return true;
    });
  }, [admins, searchQuery, filterType, screensByAdminEmail]);

  // Delete Admin
  const handleDeleteClick = (admin) => {
    setActiveMenuId(null);
    const assigned = screensByAdminEmail[admin.email] || [];
    const warningText = assigned.length > 0
      ? `Deleting ${admin.name} will unassign their ${assigned.length} display node(s) back to the network pool.`
      : `Are you sure you want to delete ${admin.name}?`;

    Swal.fire({
      title: 'Delete Admin Account?',
      text: warningText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'Yes, delete account'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: 'Removing Admin...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          await client.delete(`/master/admins/${admin.id}`);
          setAdmins(prev => prev.filter(a => a.id !== admin.id));

          Swal.fire({
            icon: 'success',
            title: 'Admin Deleted',
            text: 'Account removed and displays unassigned.',
            timer: 1500,
            showConfirmButton: false
          });
          loadData();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: err.response?.data?.error || 'Could not delete admin account.'
          });
        }
      }
    });
  };

  // Register Admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.passwordHash) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all required credentials.' });
      return;
    }

    setIsCreating(true);
    try {
      await client.post('/auth/signup', {
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        passwordHash: newAdmin.passwordHash,
        role: 'ADMIN'
      });

      Swal.fire({
        icon: 'success',
        title: 'Admin Registered!',
        text: `New admin account for "${newAdmin.name.trim()}" created successfully.`,
        timer: 1500,
        showConfirmButton: false
      });

      setNewAdmin({ name: '', email: '', passwordHash: '' });
      setShowModal(false);
      await loadData();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: err.response?.data?.message || 'Could not register admin account.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RotateCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading Tenant Admins Directory...</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Header & Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              HQ MULTI-TENANT DIRECTORY • REGIONAL FLEET ADMINISTRATORS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Manage Admins</h1>
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
              {metrics.totalAdmins} Registered Admins
            </span>
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
              {metrics.assignedScreensCount} Displays Assigned
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Provision tenant administrator credentials, manage regional account access, and oversee display assignments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Reload Directory"
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

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{
              width: 'auto',
              padding: '0.55rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <UserPlus size={18} />
            <span>Add New Admin</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Telemetry Cards (Real Data Only — Zero Hardware Telemetry) */}
      <div className="screens-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Total Admins */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Admins
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB' }}>
              <Users size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.totalAdmins}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#15803D', fontWeight: 600 }}>{metrics.adminsWithScreens} Active</span>
            <span>•</span>
            <span>{metrics.totalAdmins - metrics.adminsWithScreens} Idle</span>
          </div>
        </div>

        {/* Card 2: Assigned Fleet Displays */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Assigned Displays
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <Tv size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.assignedScreensCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Allocated across regional tenant admins
          </div>
        </div>

        {/* Card 3: Unassigned Displays */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Available Pool
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#FEF3C7', color: '#D97706' }}>
              <Layers size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.unassignedScreensCount}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Displays ready for pairing or assignment
          </div>
        </div>

        {/* Card 4: Average Fleet Allocation */}
        <div className="screen-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Allocation Ratio
            </span>
            <span style={{ padding: '0.35rem', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE' }}>
              <Shield size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {metrics.avgScreensPerAdmin}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Average screens managed per admin
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Controls Ribbon */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by admin name or email address..."
              style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.88rem', height: '38px', paddingBlock: 0 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setFilterType('ALL')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: filterType === 'ALL' ? '#ffffff' : 'transparent',
                color: filterType === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: filterType === 'ALL' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: filterType === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              All Admins ({admins.length})
            </button>
            <button
              onClick={() => setFilterType('ASSIGNED')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: filterType === 'ASSIGNED' ? '#ffffff' : 'transparent',
                color: filterType === 'ASSIGNED' ? '#15803D' : 'var(--text-secondary)',
                fontWeight: filterType === 'ASSIGNED' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: filterType === 'ASSIGNED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              Managing Screens ({metrics.adminsWithScreens})
            </button>
            <button
              onClick={() => setFilterType('UNASSIGNED')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: filterType === 'UNASSIGNED' ? '#ffffff' : 'transparent',
                color: filterType === 'UNASSIGNED' ? '#B45309' : 'var(--text-secondary)',
                fontWeight: filterType === 'UNASSIGNED' ? 600 : 500,
                fontSize: '0.8rem',
                boxShadow: filterType === 'UNASSIGNED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              Zero Screens ({metrics.totalAdmins - metrics.adminsWithScreens})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Admins Directory Cards Grid */}
      {filteredAdmins.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          <Users size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No Admins Found
          </h3>
          <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            {searchQuery
              ? `No admin matches "${searchQuery}". Try adjusting search filters.`
              : 'Get started by creating your first regional tenant administrator.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ width: 'auto', margin: '0 auto', padding: '0.5rem 1.5rem' }}
          >
            + Add New Admin
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredAdmins.map(admin => {
            const assigned = screensByAdminEmail[admin.email] || [];
            const onlineAssigned = assigned.filter(s => s.status === 'ONLINE' || s.status === 'ACTIVE').length;

            return (
              <div
                key={admin.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--glass-border)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Top Row: Avatar & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '10px',
                        background: '#EFF6FF',
                        color: 'var(--accent-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        border: '1px solid #DBEAFE'
                      }}>
                        {admin.name ? admin.name[0].toUpperCase() : 'A'}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {admin.name}
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {admin.email}
                        </span>
                      </div>
                    </div>

                    {/* Action Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === admin.id ? null : admin.id);
                        }}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === admin.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '110%',
                          background: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '0.35rem',
                          zIndex: 20,
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          minWidth: '140px'
                        }}>
                          <button
                            onClick={() => handleDeleteClick(admin)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              textAlign: 'left',
                              fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={14} /> Delete Account
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role & Displays Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      background: '#F1F5F9',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {admin.role || 'ROLE_ADMIN'}
                    </span>

                    {assigned.length > 0 ? (
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: '#DCFCE7',
                        color: '#15803D',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {onlineAssigned}/{assigned.length} Displays Online
                      </span>
                    ) : (
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: '#FEF3C7',
                        color: '#B45309',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        No Displays Assigned
                      </span>
                    )}
                  </div>

                  {/* Displays List Preview */}
                  {assigned.length > 0 && (
                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        Assigned Displays ({assigned.length}):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {assigned.slice(0, 3).map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                              {s.name}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: s.status === 'ONLINE' ? '#16A34A' : '#DC2626' }}>
                              ● {s.status}
                            </span>
                          </div>
                        ))}
                        {assigned.length > 3 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                            +{assigned.length - 3} more displays
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    href={`/master/pair?admin=${encodeURIComponent(admin.email)}`}
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--accent-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                  >
                    Pair Screen to Admin <ArrowUpRight size={13} />
                  </Link>

                  <button
                    onClick={() => handleDeleteClick(admin)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete Account"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Register Admin Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            background: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Register Tenant Admin
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Provision regional fleet administrator credentials
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 600 }}>Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sarah Connor"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    style={{ width: '100%', paddingLeft: '2.25rem' }}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 600 }}>Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="email"
                    className="input-field"
                    placeholder="sarah@enterprise.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    style={{ width: '100%', paddingLeft: '2.25rem' }}
                    required
                  />
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 600 }}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Minimum 6 characters"
                    value={newAdmin.passwordHash}
                    onChange={(e) => setNewAdmin({ ...newAdmin, passwordHash: e.target.value })}
                    style={{ width: '100%', paddingLeft: '2.25rem' }}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ffffff',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '0.5rem 1.5rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    opacity: isCreating ? 0.6 : 1,
                    cursor: isCreating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isCreating ? 'Provisioning...' : 'Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
