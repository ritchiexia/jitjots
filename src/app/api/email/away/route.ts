/** `POST /api/email/away` emails someone's lead when they are marked away. */
import { createClient } from '@supabase/supabase-js';
import { awayEmail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

/** Body: `{ id }` of the away row. Skips if there is no one to tell. */
export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.id) return Response.json({ error: 'Missing away id' }, { status: 400 });

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 });

  // uses the caller's login, so database rules apply
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 });

  const { data: away } = await supabase
    .from('availability_away')
    .select('user_id, start_date, end_date, reason')
    .eq('id', body.id)
    .maybeSingle();
  if (!away) return Response.json({ error: 'Away not found' }, { status: 404 });

  // check the caller is allowed to record away for this person
  const { data: allowed } = await supabase.rpc('can_record_away', { target: away.user_id });
  if (!allowed) {
    return Response.json({ error: 'You can’t record away for this person' }, { status: 403 });
  }

  const [{ data: person }, { data: recorder }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, lead_id').eq('id', away.user_id).maybeSingle(),
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
  ]);

  if (!person) return Response.json({ error: 'Profile not found' }, { status: 404 });
  if (!person.lead_id) return Response.json({ sent: false, skipped: 'no lead' });
  // the lead recorded it, so no need to email them
  if (person.lead_id === user.id) return Response.json({ sent: false, skipped: 'recorded by their lead' });

  const { data: lead } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', person.lead_id)
    .maybeSingle();
  if (!lead?.email) return Response.json({ sent: false, skipped: 'no lead email' });

  const name = person.full_name?.trim() || person.email || 'A volunteer';
  const recordedBy = away.user_id === user.id
    ? null
    : recorder?.full_name?.trim() || recorder?.email || user.email || null;

  try {
    await sendMail({
      to: lead.email,
      ...awayEmail({ name, recordedBy, start: away.start_date, end: away.end_date, reason: away.reason }),
    });
  } catch (e) {
    console.error('[away email]', e);
    const why = e instanceof Error ? e.message : 'Unknown SMTP error';
    return Response.json({ error: why }, { status: 502 });
  }

  return Response.json({ sent: true, to: lead.email });
}
