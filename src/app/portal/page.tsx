'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Kalam } from 'next/font/google';
import Image from 'next/image';

const kalam = Kalam({ weight: '700', subsets: ['latin'] });

const PURPLE = 'hsl(270, 8%, 49%)';
const PURPLE_DARK = '#4a4153';
const PURPLE_DARKER = '#221d28';
const YELLOW = '#f5d02e';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // forgot password mode uses the same card
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/portal/set-password` },
    );

    setLoading(false);

    // show rate limit errors, but never say whether an account exists
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    // clean up the email so autofill spaces or capitals don't fail login
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      // show the real error message
      setError(error.message);
    } else {
      router.push('/admin/bookings');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#f3f1f6',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `radial-gradient(circle, ${PURPLE}22 1.5px, transparent 1.5px)`,
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }}
      />

      <form
        onSubmit={mode === 'signin' ? handleLogin : handleReset}
        style={{
          position: 'relative',
          width: 400,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 16px 48px -12px rgba(74,65,83,.22)',
        }}
      >
        {/* header */}
        <div
          style={{
            background: PURPLE_DARK,
            padding: '24px 28px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Image
            src="/jitjots.svg"
            alt="Jit Jots logo"
            width={44}
            height={44}
            priority
          />
          <div>
            <div
              className={kalam.className}
              style={{ color: '#fff', fontSize: 22, lineHeight: 1 }}
            >
              JIT JOTS
            </div>
            <div
              style={{
                color: YELLOW,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                marginTop: 4,
              }}
            >
              ADMIN PORTAL
            </div>
          </div>
        </div>

        {/* form */}
        <div style={{ padding: '28px 28px 24px' }}>
          <div
            className={kalam.className}
            style={{ fontSize: 24, color: PURPLE_DARKER, marginBottom: 6 }}
          >
            {mode === 'signin' ? 'Welcome to Admin Portal' : 'Reset your password'}
          </div>
          <p style={{ fontSize: 13.5, color: '#8a93a0', marginBottom: 22 }}>
            {mode === 'signin'
              ? 'Sign in to manage bookings and messages.'
              : 'Enter your email and we’ll send you a link to set a new password.'}
          </p>

          <label
            style={{
              display: 'block',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#5a6573',
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@jitjots.com"
            style={{
              width: '100%',
              border: '1.5px solid #e0dce6',
              borderRadius: 10,
              padding: '11px 13px',
              fontSize: 14,
              fontFamily: 'inherit',
              color: PURPLE_DARKER,
              marginBottom: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = PURPLE)}
            onBlur={(e) => (e.target.style.borderColor = '#e0dce6')}
          />

          {mode === 'signin' && (
            <>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#5a6573',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  border: '1.5px solid #e0dce6',
                  borderRadius: 10,
                  padding: '11px 13px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: PURPLE_DARKER,
                  marginBottom: 20,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = PURPLE)}
                onBlur={(e) => (e.target.style.borderColor = '#e0dce6')}
              />
            </>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#c2403f', marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* same message whether or not the account exists */}
          {sent && (
            <div style={{ fontSize: 13, color: '#1E7A44', background: '#E6F6EC', borderRadius: 10, padding: '11px 13px', marginBottom: 14, lineHeight: 1.5 }}>
              If that address has an account, a reset link is on its way. It
              expires in an hour - check your spam folder too.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || sent}
            className={'font-mono'}
            style={{
              width: '100%',
              background: loading || sent ? '#9e96a8' : PURPLE_DARK,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '13px 16px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || sent ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? mode === 'signin' ? 'Signing in…' : 'Sending…'
              : mode === 'signin' ? 'Sign in' : sent ? 'Link sent' : 'Send reset link'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(m => (m === 'signin' ? 'reset' : 'signin'));
              setError('');
              setSent(false);
            }}
            style={{
              width: '100%', marginTop: 14, border: 'none', background: 'none',
              color: '#8a93a0', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            {mode === 'signin' ? 'Forgot your password?' : 'Back to sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
