'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return <div className="sidebar" />;

  const isMaster = user.role === 'ROLE_MASTER';
  const basePath = isMaster ? '/master' : '/admin';

  return (
    <div className="sidebar">
      <div className="sidebar-brand">Viewo {isMaster ? 'Master' : 'Admin'}</div>
      
      <div className="sidebar-nav">
        <Link 
          href={`${basePath}/dashboard`} 
          className={`nav-item ${pathname === `${basePath}/dashboard` ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        
        {isMaster ? (
          <>
            <Link 
              href="/master/admins" 
              className={`nav-item ${pathname === '/master/admins' ? 'active' : ''}`}
            >
              Manage Admins
            </Link>
            <Link 
              href="/master/screens" 
              className={`nav-item ${pathname === '/master/screens' ? 'active' : ''}`}
            >
              Network Screens
            </Link>
            <Link 
              href="/master/pair" 
              className={`nav-item ${pathname === '/master/pair' ? 'active' : ''}`}
            >
              Pair Screen
            </Link>
            <Link 
              href="/master/proof-of-play" 
              className={`nav-item ${pathname === '/master/proof-of-play' ? 'active' : ''}`}
            >
              Proof of Play
            </Link>
          </>
        ) : (
          <>
            <Link 
              href="/admin/screens" 
              className={`nav-item ${pathname === '/admin/screens' ? 'active' : ''}`}
            >
              My Screens
            </Link>
            <Link 
              href="/admin/media" 
              className={`nav-item ${pathname === '/admin/media' ? 'active' : ''}`}
            >
              Media Library
            </Link>
            <Link 
              href="/admin/playlists" 
              className={`nav-item ${pathname === '/admin/playlists' ? 'active' : ''}`}
            >
              Playlists
            </Link>
            <Link 
              href="/admin/campaigns" 
              className={`nav-item ${pathname === '/admin/campaigns' ? 'active' : ''}`}
            >
              Campaigns
            </Link>
            <Link 
              href="/admin/proof-of-play" 
              className={`nav-item ${pathname === '/admin/proof-of-play' ? 'active' : ''}`}
            >
              Proof of Play
            </Link>
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '1rem', padding: '0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Logged in as:<br/>
          <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
