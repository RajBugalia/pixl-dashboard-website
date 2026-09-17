import Sidebar from '@/components/Sidebar';

const masterLinks = [
  { href: '/master/dashboard', label: 'Dashboard' },
  { href: '/master/admins', label: 'Manage Admins' },
  { href: '/master/screens', label: 'Manage Screens' },
  { href: '/master/proof-of-play', label: 'Proof of Play Analytics' },
];

export default function MasterLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="master" links={masterLinks} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
