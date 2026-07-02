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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Trim + lowercase the email — Supabase stores it normalized, and a stray
    // space or capital from autofill otherwise causes a false "invalid".
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      // Show the real reason so confirmation/credential issues are diagnosable.
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
        onSubmit={handleLogin}
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
        {/* Header */}
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

        {/* Form body */}
        <div style={{ padding: '28px 28px 24px' }}>
          <div
            className={kalam.className}
            style={{ fontSize: 24, color: PURPLE_DARKER, marginBottom: 6 }}
          >
            Welcome to Admin Portal
          </div>
          <p style={{ fontSize: 13.5, color: '#8a93a0', marginBottom: 22 }}>
            Sign in to manage bookings and messages.
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

          {error && (
            <div style={{ fontSize: 13, color: '#c2403f', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={'font-mono'}
            style={{
              width: '100%',
              background: loading ? '#9e96a8' : PURPLE_DARK,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '13px 16px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
