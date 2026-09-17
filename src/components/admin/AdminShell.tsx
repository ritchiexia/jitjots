'use client';

/** Layout for admin pages: login check, sidebar and role based tabs. */

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNarrow } from '@/hooks/use-narrow';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  ADMIN_ROUTES,
  can,
  landingRoute,
  memberSince,
  ROLE_LABEL,
  type Profile,
  type Role,
} from '@/lib/roles';

const ACCENT_DARK = '#4a4153';
const ACCENT_TINT = '#f0edf5';

/** Sidebar icons for each page. */
const NAV_ICON: Record<string, React.ReactNode> = {
  '/admin/availability': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  '/admin/calendar': (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </>
  ),
  '/admin/bookings': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  '/admin/messages': (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </>
  ),
  // megaphone icon
  '/admin/newsletter': (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M15.5 8.5a4 4 0 0 1 0 7" />
      <path d="M18.5 5.5a8 8 0 0 1 0 13" />
    </>
  ),
  '/admin/team': (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

type AdminCtx = {
  /** The signed in user's profile, or null. */
  profile: Profile | null;
  /** Role the UI shows. Can differ from `profile.role` when previewing. */
  role: Role | null;
  /** True while an admin previews another role. */
  previewing: boolean;
};

const Ctx = createContext<AdminCtx>({ profile: null, role: null, previewing: false });

/** Current user and role. */
export const useAdmin = () => useContext(Ctx);

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  // signed in but no profile
  const [noProfile, setNoProfile] = useState(false);
  // the profile failed to load
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  // messages and emails waiting in the Messages tab
  const [messageCount, setMessageCount] = useState(0);

  // name prompt
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // "view as" role preview, admins only
  const [viewAs, setViewAs] = useState<Role | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const narrow = useNarrow();

  // the role used for everything below
  const effectiveRole: Role | null = viewAs ?? profile?.role ?? null;
  const canPreview = profile?.role === 'admin';

  useEffect(() => { setNavOpen(false); }, [pathname]);
  useEffect(() => { if (!narrow) setNavOpen(false); }, [narrow]);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    // add timeouts so the page can't hang waiting for the session
    function withTimeout<T>(p: PromiseLike<T>, ms: number, stage: string): Promise<T> {
      return Promise.race([
        Promise.resolve(p),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timed out ${stage}. Close any other portal tabs and try again.`)), ms),
        ),
      ]);
    }

    async function start(session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) {
      if (cancelled || settled) return;
      settled = true;

      try {
        if (!session) {
          router.replace('/portal');
          return; // not ready, redirecting
        }
        setUserEmail(session.user.email ?? '');

        const { data, error } = await withTimeout(
          supabase
            .from('profiles')
            .select('id, full_name, email, role, title, lead_id, graduated, active, created_at')
            .eq('id', session.user.id)
            .maybeSingle(),
          10000,
          'loading your profile',
        );

        if (cancelled) return;

        // show why the profile didn't load
        if (error) setLoadError(error.message);
        else if (!data) setNoProfile(true);
        else setProfile(data as Profile);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not reach the server');
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    // main way to get the session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void start(session);
    });

    // fallback if that doesn't fire
    withTimeout(supabase.auth.getSession(), 8000, 'checking your session')
      .then(({ data }) => start(data.session))
      .catch(e => {
        if (cancelled || settled) return;
        settled = true;
        setLoadError(e instanceof Error ? e.message : 'Could not reach the server');
        setReady(true);
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // send users away from pages their role can't open
  useEffect(() => {
    if (!ready || !effectiveRole) return;
    const route = ADMIN_ROUTES.find(r => r.href === pathname);
    if (route && !can(effectiveRole, route.permission)) {
      const fallback = landingRoute(effectiveRole);
      if (fallback) router.replace(fallback);
    }
  }, [ready, effectiveRole, pathname, router]);

  // only for roles that manage bookings
  useEffect(() => {
    if (!ready || !can(effectiveRole, 'view:bookings')) return;
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [pathname, ready, effectiveRole]);

  // count messages waiting
  useEffect(() => {
    if (!ready || !can(effectiveRole, 'view:messages')) return;

    Promise.all([
      supabase.from('messages')
        .select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      // unfiled emails waiting
      supabase.from('inbound_emails')
        .select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([a, b]) => setMessageCount((a.count ?? 0) + (b.count ?? 0)));
  }, [pathname, ready, effectiveRole]);

  // ask for a name if it's blank
  const nameMissing = !!profile && !profile.full_name.trim();

  useEffect(() => {
    if (ready && nameMissing) openNameDialog();
    // only while the name is blank
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, nameMissing]);

  function openNameDialog() {
    const parts = (profile?.full_name ?? '').trim().split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setEditingName(true);
  }

  async function saveName() {
    if (!profile) return;
    const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    if (!full) {
      toast.error('Please enter at least a first name.');
      return;
    }

    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: full })
      .eq('id', profile.id);
    setSavingName(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile({ ...profile, full_name: full });
    setEditingName(false);
    toast.success('Name updated');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/portal');
  }

  // always show something
  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f8', color: '#9aa3ad', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f8', padding: 24 }}>
        <div style={{ maxWidth: 460, background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '32px 30px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 19, marginBottom: 8 }}>
            Couldn’t load your account
          </div>
          <div style={{ fontSize: 14, color: '#6b7585', lineHeight: 1.6, marginBottom: 14 }}>
            Signed in as {userEmail}, but reading your profile failed.
          </div>
          <div style={{ fontSize: 12.5, fontFamily: 'ui-monospace, monospace', color: '#C2403F', background: '#FCEAEA', borderRadius: 8, padding: '10px 12px', marginBottom: 20, textAlign: 'left', wordBreak: 'break-word' }}>
            {loadError}
          </div>
          <button
            onClick={handleLogout}
            style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: '#4b5563' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // signed in but no profile
  if (noProfile) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f8', padding: 24 }}>
        <div style={{ maxWidth: 420, background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '32px 30px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 19, marginBottom: 8 }}>
            Account not set up yet
          </div>
          <div style={{ fontSize: 14, color: '#6b7585', lineHeight: 1.6, marginBottom: 20 }}>
            You’re signed in as {userEmail}, but this account hasn’t been given a
            role yet. Ask an admin to finish setting it up.
          </div>
          <button
            onClick={handleLogout}
            style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: '#4b5563' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

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

  const sidebar = (
    <>
        {/* logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '18px 18px 16px',
          }}
        >
          <Image
            src="/jitjots.svg"
            width={50}
            height={50}
            alt="Jit Jots logo"
            priority
            style={{ flexShrink: 0 }}
          />
          <div
            style={{
              fontFamily: 'var(--font-nunito)',
              fontWeight: 800,
              fontSize: 19,
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
            PORTAL
          </div>
        </div>

        {/* nav */}
        <nav
          style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* only tabs this role can open */}
          {ADMIN_ROUTES.filter(r => can(effectiveRole, r.permission)).map(r => {
            // count badge for each tab
            const waiting =
              r.href === '/admin/bookings' ? pendingCount
                : r.href === '/admin/messages' ? messageCount
                : 0;

            return (
              <Link
                key={r.href}
                href={r.href}
                onClick={() => setNavOpen(false)}
                style={pathname === r.href ? navActive : navBase}
              >
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
                  {NAV_ICON[r.href]}
                </svg>
                <span style={{ flex: 1 }}>{r.label}</span>
                {waiting > 0 && (
                  <span
                    title={`${waiting} waiting`}
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
                    {waiting}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* view as picker, admins only */}
        {canPreview && (
          <div style={{ marginTop: 'auto', padding: '12px 16px 0' }}>
            <label
              htmlFor="view-as"
              style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ad', marginBottom: 6 }}
            >
              View as
            </label>
            <select
              id="view-as"
              value={viewAs ?? ''}
              onChange={e => setViewAs((e.target.value || null) as Role | null)}
              style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '7px 9px', fontSize: 13, fontFamily: 'inherit', color: '#4b5563', background: '#fff', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Myself (Admin)</option>
              {(Object.keys(ROLE_LABEL) as Role[])
                .filter(r => r !== 'admin')
                .map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
            </select>
          </div>
        )}

        {/* user and logout */}
        <div
          style={{
            // avoid double auto margins
            marginTop: canPreview ? 12 : 'auto',
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
          {/* click your name to change it */}
          <button
            onClick={openNameDialog}
            title="Edit your name"
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.15, color: '#1d2733', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Add your name'}
            </div>
            <div style={{ fontSize: 11.5, color: '#9aa3ad', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {effectiveRole ? ROLE_LABEL[effectiveRole] : userEmail}
              {profile?.created_at ? ` · since ${memberSince(profile.created_at)}` : ''}
            </div>
          </button>
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
    </>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: narrow ? 'column' : 'row',
        height: '100vh',
        width: '100%',
        background: '#f5f7f8',
        overflow: 'hidden',
      }}
    >
      {narrow && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: '#fff',
            borderBottom: '1px solid #e6e9ee',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setNavOpen(o => !o)}
            aria-label="Open menu"
            style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Image src="/jitjots.svg" width={32} height={32} alt="" style={{ flexShrink: 0 }} />
          <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 16, flex: 1 }}>
            Jit Jots
          </div>
        </div>
      )}

      {narrow && navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.34)', zIndex: 70 }}
        />
      )}

      <aside
        style={narrow
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              maxWidth: '86vw',
              background: '#fff',
              zIndex: 80,
              display: 'flex',
              flexDirection: 'column',
              transform: navOpen ? 'translateX(0)' : 'translateX(-105%)',
              transition: 'transform .18s ease',
              boxShadow: navOpen ? '8px 0 30px -16px rgba(15,23,30,.4)' : 'none',
            }
          : {
              width: 246,
              minWidth: 246,
              background: '#fff',
              borderRight: '1px solid #e6e9ee',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
      >
        {sidebar}
      </aside>

      {/* page content */}
      <main
        className="portal-main"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: narrow ? 'calc(100% - 58px)' : '100%',
          overflow: 'hidden',
        }}
      >
        {/* preview banner */}
        {viewAs && (
          <div
            className="portal-preview"
            style={{ background: '#FEF4E0', borderBottom: '1px solid #F3DDB0', color: '#7a5400', padding: '9px 28px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span style={{ flex: 1 }}>
              Previewing as <strong>{ROLE_LABEL[viewAs]}</strong>. You only see
              the tabs and actions that role is allowed. Writes still use your
              admin session.
            </span>
            <button
              onClick={() => setViewAs(null)}
              style={{ border: '1px solid #E0C68A', background: '#fff', borderRadius: 8, padding: '5px 11px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', color: '#7a5400', whiteSpace: 'nowrap' }}
            >
              Exit preview
            </button>
          </div>
        )}
        <Ctx.Provider value={{ profile, role: effectiveRole, previewing: !!viewAs }}>
          {children}
        </Ctx.Provider>
      </main>

      {/* name dialog */}
      {editingName && (
        <div
          // can't be skipped while the name is blank
          onClick={() => { if (!nameMissing) setEditingName(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.4)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 360, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: '24px 24px 20px', boxShadow: '0 20px 60px -20px rgba(15,23,30,.4)' }}
          >
            <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              {nameMissing ? 'Welcome - what should we call you?' : 'Your name'}
            </div>
            <div style={{ fontSize: 13, color: '#8a93a0', marginBottom: 18, lineHeight: 1.5 }}>
              {nameMissing
                ? 'This is what the team sees next to your hours on the calendar. You can change it later from the sidebar.'
                : 'This is what the team sees next to your hours on the calendar.'}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="first-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 5 }}>
                  First name
                </label>
                <input
                  id="first-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoFocus
                  style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 11px', fontSize: 14, fontFamily: 'inherit', color: '#1d2733', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="last-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 5 }}>
                  Last name
                </label>
                <input
                  id="last-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveName(); }}
                  style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 11px', fontSize: 14, fontFamily: 'inherit', color: '#1d2733', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              {/* no cancel on the first prompt */}
              {!nameMissing && (
                <button
                  onClick={() => setEditingName(false)}
                  style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '9px 15px', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: '#4b5563' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveName}
                disabled={savingName || !firstName.trim()}
                style={{ border: 'none', background: savingName || !firstName.trim() ? '#eef1f3' : ACCENT_DARK, color: savingName || !firstName.trim() ? '#a7aeb8' : '#fff', borderRadius: 9, padding: '9px 18px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: savingName || !firstName.trim() ? 'default' : 'pointer' }}
              >
                {savingName ? 'Saving…' : nameMissing ? 'Continue' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
