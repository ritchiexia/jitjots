/** `POST /api/users/remove` permanently deletes a portal user and their data. */
import { createClient } from '@supabase/supabase-js';
import { can, type Role } from '@/lib/roles';

export const runtime = 'nodejs';

/** Body: `{ id }`. Needs the `manage:users` permission. */
export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id) return Response.json({ error: 'Missing user id' }, { status: 400 });

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 });

  const asCaller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await asCaller.auth.getUser(token);
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  // you can't remove yourself
  if (user.id === body.id) {
    return Response.json({ error: 'You can’t remove your own account' }, { status: 400 });
  }

  const { data: me } = await asCaller
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!can(me?.role as Role | undefined, 'manage:users')) {
    return Response.json({ error: 'You do not have permission to remove users' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server' }, { status: 500 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // keep at least one admin or president
  const { data: target } = await admin
    .from('profiles')
    .select('role, email')
    .eq('id', body.id)
    .maybeSingle();

  if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

  if (target.role === 'admin' || target.role === 'president') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['admin', 'president']);

    if ((count ?? 0) <= 1) {
      return Response.json(
        { error: 'This is the only admin left - promote someone else first' },
        { status: 400 },
      );
    }
  }

  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) {
    // replace an empty error with a readable message
    console.error('[remove user]', error);
    const reason = error.message && error.message !== '{}'
      ? error.message
      : 'Supabase refused to delete this account - check the database logs';
    return Response.json({ error: reason }, { status: 502 });
  }

  return Response.json({ removed: target.email });
}
