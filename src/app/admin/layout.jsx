import Navbar from '@/components/Navbar';

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
    <div className="dashboard-layout">
      <Navbar role="admin" links={adminLinks} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
