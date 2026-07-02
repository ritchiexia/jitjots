'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

const ACCENT_DARK = '#4a4153';
const ACCENT_TINT = '#f0edf5';

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/portal');
      } else {
        setUserEmail(session.user.email ?? '');
        setReady(true);
        fetchCounts();
      }
    });
  }, [router]);

  useEffect(() => {
    if (ready) fetchCounts();
  }, [pathname, ready]);

  async function fetchCounts() {
    const { count: pending } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');
    setPendingCount(pending ?? 0);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/portal');
  }

  if (!ready) return null;

  const isCalendar = pathname === '/admin/calendar';
  const isBookings = pathname === '/admin/bookings';

  const navBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    color: '#4b5563',
  };
  const navActive: React.CSSProperties = {
    ...navBase,
    background: ACCENT_TINT,
    color: ACCENT_DARK,
  };

  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        background: '#f5f7f8',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 246,
          minWidth: 246,
          background: '#fff',
          borderRight: '1px solid #e6e9ee',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '20px 20px 18px',
          }}
        >
          <Image
            src="/jitjots.svg"
            width={34}
            height={34}
            alt="Jit Jots logo"
            priority
            style={{ flexShrink: 0 }}
          />
          <div
            style={{
              fontFamily: 'var(--font-nunito)',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: '-0.3px',
            }}
          >
            Jit Jots
          </div>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#9aa3ad',
              border: '1px solid #e6e9ee',
              borderRadius: 5,
              padding: '2px 6px',
            }}
          >
            ADMIN
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Link href="/admin/calendar" style={isCalendar ? navActive : navBase}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            <span style={{ flex: 1 }}>Calendar</span>
          </Link>
          <Link href="/admin/bookings" style={isBookings ? navActive : navBase}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span style={{ flex: 1 }}>Bookings</span>
            {pendingCount > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 999,
                  background: '#FEF4E0',
                  color: '#9A6A00',
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        </nav>

        {/* User / logout */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #eef1f3',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: '#eef1f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              color: '#5a6573',
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.1 }}>
              Admin
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: '#9aa3ad',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userEmail}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#9aa3ad',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </main>
    </div>
  );
}
