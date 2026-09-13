'use client';

// unsubscribe page from the newsletter link. no sign in needed.
// uses a confirm button so email link previews don't unsubscribe people

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function Unsubscribe() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function confirm() {
    setState('working');
    const res = await fetch('/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(json.error ?? 'Something went wrong.');
      setState('error');
      return;
    }
    setMessage(json.unsubscribed ?? '');
    setState('done');
  }

  return (
    <main className="flex-1 container mx-auto px-6 lg:px-32 py-20">
      <div className="max-w-md mx-auto rounded-2xl border bg-card p-8 shadow-sm text-center">
        {state === 'done' ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">Unsubscribed</h1>
            <p className="mt-3 text-muted-foreground">
              {message
                ? <>We&apos;ve removed <strong>{message}</strong> from our newsletter. You won&apos;t hear from us again unless you sign up.</>
                : <>You won&apos;t hear from us again unless you sign up.</>}
            </p>
          </>
        ) : state === 'error' ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">
              That didn&apos;t work
            </h1>
            <p className="mt-3 text-muted-foreground">{message}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Reply to any of our emails and we&apos;ll take you off the list by hand.
            </p>
          </>
        ) : !token ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Missing unsubscribe link
            </h1>
            <p className="mt-3 text-muted-foreground">
              Use the link at the bottom of one of our emails.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Unsubscribe from our newsletter?
            </h1>
            <p className="mt-3 text-muted-foreground">
              You&apos;ll stop receiving updates from Jit Jots Science Education
              Society.
            </p>
            <button
              onClick={confirm}
              disabled={state === 'working'}
              className="mt-6 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {state === 'working' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  // useSearchParams needs a suspense boundary
  return (
    <Suspense fallback={null}>
      <Unsubscribe />
    </Suspense>
  );
}
