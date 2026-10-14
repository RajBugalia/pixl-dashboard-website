import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/screens', label: 'My Screens' },
  { href: '/admin/media', label: 'Media Library' },
  { href: '/admin/playlists', label: 'Playlists' },
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/proof-of-play', label: 'Proof of Play' },
];

export default function AdminLayout({ children }) {
  return (
    <AuthGuard allowedRole="ROLE_ADMIN" fallbackRoute="/master/dashboard">
      <div className="dashboard-layout">
        <Navbar role="admin" links={adminLinks} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
