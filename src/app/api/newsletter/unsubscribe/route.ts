/** `POST /api/newsletter/unsubscribe` unsubscribes someone using the token from their email link. */
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/** Body: `{ token }`. */
export async function POST(req: Request) {
  let payload: { token?: string };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = payload.token?.trim();
  // check the token looks like a uuid
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return Response.json({ error: 'Invalid unsubscribe link' }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json({ error: 'Server is not configured for this' }, { status: 500 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .select('email')
    .maybeSingle();

  if (error) {
    console.error('[unsubscribe]', error);
    return Response.json({ error: 'Could not process that right now' }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'That link is no longer valid' }, { status: 404 });
  }

  // return the email so the page can show it
  return Response.json({ unsubscribed: data.email });
}
