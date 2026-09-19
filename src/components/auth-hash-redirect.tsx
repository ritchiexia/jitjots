'use client';

// sends invite and password reset links to the set password page,
// wherever they land on the site.

import { useEffect } from 'react';

const TARGET = '/portal/set-password';

export default function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;

    const type = new URLSearchParams(hash.slice(1)).get('type');
    if (type !== 'invite' && type !== 'recovery') return;

    // already on the right page
    if (window.location.pathname.startsWith(TARGET)) return;

    // full page load so the link's session info is kept
    window.location.replace(TARGET + hash);
  }, []);

  return null;
}
