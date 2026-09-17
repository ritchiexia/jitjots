'use client';

// invite links land here. the user is signed in but has no password yet.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

export default function SetPasswordPage() {
  const router = useRouter();

  // 'checking' while loading, 'ready' shows the form, 'invalid' if the link expired
  const [state, setState] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // the session can take a moment to load, so listen for it too
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email ?? '');
        setState('ready');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setEmail(data.session.user.email ?? '');
        setState('ready');
      } else {
        // wait a moment before calling the link invalid
        setTimeout(() => setState(s => (s === 'checking' ? 'invalid' : s)), 2500);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Please use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Those passwords don’t match.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    setSaving(false);
    toast.success('You’re all set.');
    router.push('/admin/calendar');
  }

  const field: React.CSSProperties = {
    width: '100%', border: '1px solid #d8dde3', borderRadius: 9,
    padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
    color: '#1d2733', outline: 'none', background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f8', padding: 24 }}>
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px -18px rgba(15,23,30,.35)' }}>
        <div style={{ background: ACCENT_DARK, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <Image src="/jitjots.svg" width={30} height={30} alt="" priority />
          <div style={{ fontFamily: 'var(--font-kalam), cursive', color: '#fff', fontSize: 19, fontWeight: 700 }}>
            JIT JOTS
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#f5d02e' }}>
            ADMIN PORTAL
          </div>
        </div>

        <div style={{ padding: '28px 26px 30px' }}>
          {state === 'checking' && (
            <div style={{ fontSize: 14, color: '#8a93a0', textAlign: 'center', padding: '20px 0' }}>
              Checking your invite…
            </div>
          )}

          {state === 'invalid' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                This link has expired
              </div>
              <div style={{ fontSize: 14, color: '#6b7585', lineHeight: 1.6, marginBottom: 20 }}>
                Invite links can only be used once. Ask an admin to send you a
                new one.
              </div>
              <button
                onClick={() => router.push('/portal')}
                style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: '#4b5563' }}
              >
                Back to sign in
              </button>
            </div>
          )}

          {state === 'ready' && (
            <>
              <div style={{ fontFamily: 'var(--font-kalam), cursive', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                Welcome to Jit Jots
              </div>
              <div style={{ fontSize: 13.5, color: '#8a93a0', marginBottom: 22, lineHeight: 1.55 }}>
                Setting up <strong style={{ color: '#4b5563' }}>{email}</strong>.
                Choose a password and you’re in.
              </div>

              {/* password only. the name is asked for inside the portal. */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="password" style={labelStyle}>Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="At least 8 characters"
                    style={field}
                  />
                </div>
                <div>
                  <label htmlFor="confirm" style={labelStyle}>Confirm password</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={field}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{ marginTop: 4, padding: '11px 16px', borderRadius: 9, border: 'none', background: saving ? '#b9b2c4' : ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ibm-plex-mono), monospace', letterSpacing: '0.03em', cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? 'Setting up…' : 'Set password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
