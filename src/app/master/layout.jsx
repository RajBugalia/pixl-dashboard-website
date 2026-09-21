import Navbar from '@/components/Navbar';

const masterLinks = [
  { href: '/master/dashboard', label: 'Dashboard' },
  { href: '/master/admins', label: 'Manage Admins' },
  { href: '/master/screens', label: 'Manage Screens' },
  { href: '/master/pair', label: 'Pair Screen' },
  { href: '/master/proof-of-play', label: 'Proof of Play Analytics' },
];

export default function MasterLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Navbar role="master" links={masterLinks} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
