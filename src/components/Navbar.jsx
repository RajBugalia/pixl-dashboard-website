'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { API_BASE_URL } from '@/config/constants';

export default function Navbar({ role, links }) {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();
  const pathname = usePathname();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
      setShowNotifications(false);
    };
    if (showDropdown || showNotifications) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown, showNotifications]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="top-nav" />;

  const isMaster = role === 'master';
  const basePath = isMaster ? '/master' : '/admin';

  return (
    <nav className="top-nav">
      <div className="nav-container">
        {/* Brand / Logo */}
        <div className="nav-brand">
          <img src="/logo_new.png" alt="PixL Logo" className="nav-logo-img" onError={(e) => { e.target.src='/logo.png'; }} />
          <span className="nav-brand-text">PixL <span style={{fontWeight: 300}}>{isMaster ? 'Master' : 'Admin'}</span></span>
        </div>
        
        {/* Navigation Links */}
        <div className="nav-links">
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin/dashboard' && link.href !== '/master/dashboard');
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="nav-actions">
          <div style={{ position: 'relative' }}>
            <button 
              className="icon-button" 
              title="Notifications" 
              onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowDropdown(false); }}
            >
              <Bell size={20} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="notification-dot"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="profile-dropdown" style={{ width: '320px', right: '-10px', top: 'calc(100% + 1rem)' }}>
                <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Notifications</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', cursor: 'pointer' }} onClick={() => router.push(`${basePath}/notifications`)}>View All</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No notifications</div>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9', background: n.isRead ? 'transparent' : 'rgba(37,99,235,0.04)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: n.isRead ? 500 : 600, color: 'var(--text-primary)' }}>
                          {n.type === 'SUCCESS' ? 'Success' : n.type === 'WARNING' ? 'Warning' : n.type === 'ERROR' ? 'Error' : 'Info'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{n.message}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="profile-menu-container">
            <button 
              className="profile-button" 
              onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); setShowNotifications(false); }}
            >
              <div className="avatar">
                <User size={18} />
              </div>
              <span className="profile-name">{user.name}</span>
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <p className="dropdown-name">{user.name}</p>
                  <p className="dropdown-email">{user.email}</p>
                </div>
                <button onClick={() => { setShowDropdown(false); router.push(`${basePath}/settings`); }} className="dropdown-item">
                  <Settings size={16} /> Settings
                </button>
                <button onClick={handleLogout} className="dropdown-item text-red">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
