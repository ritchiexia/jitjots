import { Nunito, Public_Sans } from 'next/font/google';
import AdminShell from '@/components/admin/AdminShell';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-public-sans',
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${nunito.variable} ${publicSans.variable}`}
      style={{ fontFamily: "var(--font-public-sans), -apple-system, sans-serif", height: '100vh', overflow: 'hidden' }}
    >
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
