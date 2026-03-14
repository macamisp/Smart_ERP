import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Home, ChefHat, Bell, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Smart Restaurant ERP',
  description: 'Self-ordering system powered by ERP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1rem 2rem', background: 'rgba(0,0,0,0.5)', display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
           <Link href="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
             <Home size={18}/> Guest Tablet
           </Link>
           <Link href="/kds" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
             <ChefHat size={18}/> KDS Dashboard
           </Link>
           <Link href="/waiter" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
             <Bell size={18}/> Waiter View
           </Link>
           <Link href="/admin" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
             <BarChart3 size={18}/> Admin Hub
           </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
