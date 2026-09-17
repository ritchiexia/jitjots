/** `POST /api/users/invite` emails an invite to a new portal user. The email is sent by Supabase, not Gmail. */
import { createClient } from '@supabase/supabase-js';
import { can, type Role } from '@/lib/roles';

export const runtime = 'nodejs';

// new users always start as volunteers. admins can promote them later.
const STARTING_ROLE: Role = 'volunteer';

/** Body: `{ email, lead_id }`. Needs the `manage:users` permission. */
export async function POST(req: Request) {
  let body: { email?: string; lead_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  // the lead they report to. null means decide later.
  const leadId = body.lead_id?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'A valid email address is required' }, { status: 400 });
  }

  // CHECK THE CALLER
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 });

  const asCaller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await asCaller.auth.getUser(token);
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  // get the caller's role from the database
  const { data: me } = await asCaller
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!can(me?.role as Role | undefined, 'manage:users')) {
    return Response.json({ error: 'You do not have permission to invite users' }, { status: 403 });
  }

  // make sure the lead exists and is an exec
  if (leadId) {
    const { data: lead } = await asCaller
      .from('profiles')
      .select('role')
      .eq('id', leadId)
      .maybeSingle();

    if (!lead) {
      return Response.json({ error: 'That team no longer exists' }, { status: 400 });
    }
    if (lead.role === 'volunteer') {
      return Response.json({ error: 'A volunteer cannot lead a team' }, { status: 400 });
    }
  }

  // SEND THE INVITE
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server' },
      { status: 500 },
    );
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // where the invite link goes
  const origin = new URL(req.url).origin;
  const redirectTo = `${origin}/portal/set-password`;

  // already invited? resend the link and keep their role and lead
  const { data: existing } = await admin
    .from('profiles')
    .select('id, role, lead_id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    const { data: account } = await admin.auth.admin.getUserById(existing.id);
    if (account?.user?.email_confirmed_at) {
      return Response.json({ error: `${email} already has an account` }, { status: 409 });
    }
    const { error: resendError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (resendError) {
      return Response.json({ error: resendError.message }, { status: 502 });
    }
    return Response.json({ invited: email, role: existing.role, lead_id: existing.lead_id, resent: true });
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (inviteError || !invited?.user) {
    const msg = inviteError?.message ?? 'Invite failed';
    // clearer message when they already have an account
    const status = /already/i.test(msg) ? 409 : 502;
    return Response.json({ error: msg }, { status });
  }

  // the profile already exists, so just set their lead
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: STARTING_ROLE, lead_id: leadId })
    .eq('id', invited.user.id);

  if (profileError) {
    // the invite was sent, only setting the lead failed
    return Response.json(
      { error: `Invited, but could not finish setting up their profile: ${profileError.message}` },
      { status: 502 },
    );
  }

  return Response.json({ invited: email, role: STARTING_ROLE, lead_id: leadId });
}
