'use client';

/** Team page. Invite people, set roles and leads, and group people by team. */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminShell';
import { ROLE_LABEL, can, canRecordAway, memberSince, type Profile, type Role } from '@/lib/roles';
import { MONTHS_AHEAD, type AwayRange } from '@/lib/availability';

const ACCENT = 'hsl(270, 8%, 49%)';
const ACCENT_DARK = '#4a4153';

const ROLES = Object.keys(ROLE_LABEL) as Role[];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Allowed dates for away ranges: today to the end of the booking window. */
function awayWindow(now = new Date()) {
  return {
    min: dateKey(now),
    max: dateKey(new Date(now.getFullYear(), now.getMonth() + MONTHS_AHEAD + 1, 0)),
  };
}

function fmtSpan(start: string, end: string) {
  const short = (iso: string) => {
    const [, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m - 1]} ${+d}`;
  };
  return start === end ? short(start) : `${short(start)} to ${short(end)}`;
}

/** First day of each full month an away range covers. */
function fullMonths(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const stop = new Date(ey, em - 1, 1);
  for (const d = new Date(sy, sm - 1, 1); d <= stop; d.setMonth(d.getMonth() + 1)) {
    const first = dateKey(d);
    const last = dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    if (start <= first && end >= last) out.push(first);
  }
  return out;
}

export default function TeamPage() {
  const { profile, role: myRole } = useAdmin();

  // leads can view, presidents and admins can edit
  const canManage = can(myRole, 'manage:users');
  const asViewer = profile ? { ...profile, role: myRole ?? profile.role } : null;

  // owners can graduate anyone, leads only their own volunteers
  function canGraduate(target: Profile) {
    if (!can(myRole, 'manage:graduation')) return false;
    return canManage || target.lead_id === profile?.id;
  }

  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [aways, setAways] = useState<AwayRange[]>([]);
  const [awayDraft, setAwayDraft] = useState<{
    person: Profile;
    start: string;
    end: string;
    reason: string;
  } | null>(null);
  const [awaySaving, setAwaySaving] = useState(false);

  // execs who can be a lead
  const leads = people.filter(p => p.role !== 'volunteer');

  const [email, setEmail] = useState('');
  // lead for the new person. '' means none.
  const [leadId, setLeadId] = useState('');
  const [inviting, setInviting] = useState(false);

  // people grouped by team. your team first, then execs, then other teams.
  const groups = useMemo(() => {
    const execs = people.filter(p => p.role !== 'volunteer');
    const volunteers = people.filter(p => p.role === 'volunteer');
    const execIds = new Set(execs.map(e => e.id));

    const teams = execs
      .map(lead => ({
        key: lead.id,
        title: `${lead.full_name || lead.email}’s team`,
        rows: volunteers.filter(v => v.lead_id === lead.id),
        mine: lead.id === profile?.id,
      }))
      // skip leads with no one on their team
      .filter(t => t.rows.length > 0);

    return [
      ...teams.filter(t => t.mine),
      {
        key: '__execs',
        title: 'Execs',
        rows: execs,
        note: 'Leads, president and admins. They can always run a workshop.',
        mine: false,
      },
      ...teams.filter(t => !t.mine),
      {
        key: '__unassigned',
        title: 'Unassigned',
        // include people whose lead was removed
        rows: volunteers.filter(v => !v.lead_id || !execIds.has(v.lead_id)),
        note: 'Nobody supervises them yet, so only a president or admin can graduate them.',
        mine: false,
      },
    ].filter(g => g.rows.length > 0);
  }, [people, profile]);

  // removing a person needs two confirmations
  const [removing, setRemoving] = useState<Profile | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [removingBusy, setRemovingBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const today = dateKey(new Date());
    const [{ data }, { data: awayRows }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, title, lead_id, graduated, active, created_at')
        .order('created_at'),
      supabase
        .from('availability_away')
        .select('id, user_id, start_date, end_date, reason')
        .gte('end_date', today),
    ]);
    setPeople((data ?? []) as Profile[]);
    setAways((awayRows ?? []) as AwayRange[]);
    setLoading(false);
  }

  function awaysFor(userId: string) {
    return aways.filter(a => a.user_id === userId).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  function openAway(person: Profile) {
    const today = dateKey(new Date());
    setAwayDraft({ person, start: today, end: today, reason: '' });
  }

  async function submitAway() {
    if (!awayDraft) return;
    const start = awayDraft.start;
    const end = awayDraft.end;
    if (!start || !end || start > end) {
      toast.error('Pick a start date and an end date.');
      return;
    }
    // check typed dates too
    const { min, max } = awayWindow();
    if (start < min) {
      toast.error('Away can only start today or later.');
      return;
    }
    if (end > max) {
      toast.error(`Away can only be set up to the end of ${new Date(`${max}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.`);
      return;
    }
    const person = awayDraft.person;
    const who = person.full_name || person.email;

    setAwaySaving(true);
    const { data: created, error } = await supabase
      .from('availability_away')
      .insert({
        user_id: person.id,
        start_date: start,
        end_date: end,
        reason: awayDraft.reason.trim() || 'Away',
      })
      .select('id, user_id, start_date, end_date, reason')
      .single();
    if (error || !created) {
      setAwaySaving(false);
      toast.error(error?.message ?? 'Could not record that they are away.');
      return;
    }

    // the away is saved. report errors here without undoing it.
    const problems: string[] = [];

    const { error: clearError } = await supabase.from('availability')
      .delete().eq('user_id', person.id).gte('date', start).lte('date', end);
    if (clearError) problems.push(`their hours weren’t cleared (${clearError.message})`);

    const months = fullMonths(start, end);
    if (months.length) {
      const { error: monthError } = await supabase.from('availability_months').upsert(
        months.map(month => ({ user_id: person.id, month, unavailable: true, updated_at: new Date().toISOString() })),
      );
      if (monthError) problems.push(`the months weren’t marked unavailable (${monthError.message})`);
    }

    setAways(prev => [...prev, created as AwayRange]);
    setAwaySaving(false);
    setAwayDraft(null);
    if (problems.length) toast.warning(`${who} is marked away, but ${problems.join(' and ')}`);
    else toast.success(`${who} is marked away`);

    void notifyLead(created.id, who);
  }

  // email their lead. an email error doesn't undo the save.
  async function notifyLead(awayId: string, who: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const res = await fetch('/api/email/away', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: awayId }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) toast.error(`Couldn’t email ${who}’s lead: ${json.error ?? res.statusText}`);
    else if (json.sent) toast.success(`Emailed their lead at ${json.to}`);
  }

  async function clearAway(a: AwayRange) {
    const { error } = await supabase.from('availability_away').delete().eq('id', a.id);
    if (error) { toast.error(error.message); return; }

    // clear the months this range marked away, unless another away still covers them
    const stillCovered = new Set(
      aways
        .filter(x => x.id !== a.id && x.user_id === a.user_id)
        .flatMap(x => fullMonths(x.start_date, x.end_date)),
    );
    const release = fullMonths(a.start_date, a.end_date).filter(m => !stillCovered.has(m));

    setAways(prev => prev.filter(x => x.id !== a.id));

    if (release.length) {
      const { error: monthError } = await supabase.from('availability_months')
        .delete().eq('user_id', a.user_id).in('month', release);
      if (monthError) {
        toast.warning(`Away cleared, but the months are still marked unavailable: ${monthError.message}`);
        return;
      }
    }
    toast.success('Away cleared');
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setInviting(false);
      toast.error('Session expired - sign in again.');
      return;
    }

    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // only the email and lead are sent. new people start as volunteers.
      body: JSON.stringify({ email, lead_id: leadId || null }),
    });
    const json = await res.json().catch(() => ({}));
    setInviting(false);

    if (!res.ok) {
      toast.error(json.error ?? 'Could not send the invite.');
      return;
    }

    if (json.resent) {
      // they were invited before and haven't set a password yet
      toast.success(`Invite resent to ${email}`, {
        description: 'Their team and role were left as they were.',
      });
    } else {
      const team = people.find(p => p.id === leadId);
      toast.success(`Invite sent to ${email}`, {
        description: team ? `They join ${team.full_name || team.email}'s team.` : undefined,
      });
    }
    setEmail('');
    setLeadId('');
    load();
  }

  // only presidents and admins can do this
  async function changeRole(id: string, next: Role) {
    const previous = people;
    setPeople(prev => prev.map(p => (p.id === id ? { ...p, role: next } : p)));

    const { error } = await supabase.from('profiles').update({ role: next }).eq('id', id);
    if (error) {
      setPeople(previous);
      toast.error(error.message);
      return;
    }
    toast.success(`Role updated to ${ROLE_LABEL[next]}`);
  }

  // the lead also decides who can graduate them
  async function changeLead(target: Profile, lead_id: string | null) {
    const previous = people;
    setPeople(prev => prev.map(p => (p.id === target.id ? { ...p, lead_id } : p)));

    const { error } = await supabase.from('profiles').update({ lead_id }).eq('id', target.id);
    if (error) {
      setPeople(previous);
      toast.error(error.message);
      return;
    }

    const lead = people.find(p => p.id === lead_id);
    toast.success(lead
      ? `${target.full_name || target.email} now reports to ${lead.full_name || lead.email}`
      : `${target.full_name || target.email} has no lead`);
  }

  // saved when the field loses focus. empty uses the role name.
  async function saveTitle(target: Profile, raw: string) {
    const title = raw.trim();
    if (title === target.title) return;
    // don't save if nothing changed
    if (!target.title && title === ROLE_LABEL[target.role]) return;

    const previous = people;
    setPeople(prev => prev.map(p => (p.id === target.id ? { ...p, title } : p)));

    const { error } = await supabase.from('profiles').update({ title }).eq('id', target.id);
    if (error) {
      setPeople(previous);
      toast.error(error.message);
      return;
    }
    toast.success(title ? `Title set to “${title}”` : 'Title cleared');
  }

  // marks a volunteer as able to lead a workshop
  async function toggleGraduated(target: Profile) {
    const next = !target.graduated;
    const previous = people;
    setPeople(prev => prev.map(p => (p.id === target.id ? { ...p, graduated: next } : p)));

    const { error } = await supabase.from('profiles').update({ graduated: next }).eq('id', target.id);
    if (error) {
      setPeople(previous);
      toast.error(error.message);
      return;
    }
    toast.success(
      next
        ? `${target.full_name || target.email} can now run sessions unaccompanied`
        : `${target.full_name || target.email} needs an exec present again`,
    );
  }

  async function removeUser(target: Profile) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error('Session expired - sign in again.');
      return;
    }

    const res = await fetch('/api/users/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: target.id }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(json.error ?? 'Could not remove that user.');
      return;
    }

    setPeople(prev => prev.filter(p => p.id !== target.id));
    setRemoving(null);
    setConfirmText('');
    toast.success(`Removed ${target.email}`);
  }

  const field: React.CSSProperties = {
    border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 11px',
    fontSize: 13.5, fontFamily: 'inherit', color: '#1d2733', outline: 'none', background: '#fff',
  };

  if (!can(myRole, 'view:volunteers')) return null;

  return (
    <>
      <div className="portal-head" style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e6e9ee', background: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.2px' }}>
          Team
        </div>
        <div style={{ fontSize: 13.5, color: '#8a93a0', marginTop: 2 }}>
          {people.length} {people.length === 1 ? 'person' : 'people'}
        </div>
      </div>

      <div className="portal-body" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {/* invite: presidents and admins only */}
        {canManage && (
        <form
          onSubmit={invite}
          style={{ background: '#fff', border: '1px solid #e6e9ee', borderRadius: 13, padding: '18px 20px', marginBottom: 20 }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa3ad', marginBottom: 12 }}>
            Invite someone
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="their@email.com"
              style={{ ...field, flex: '2 1 220px' }}
            />
            {/* the lead they report to */}
            <select
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
              style={{ ...field, flex: '1 1 170px', cursor: 'pointer', color: leadId ? '#1d2733' : '#6b7585' }}
            >
              <option value="">No team yet</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.full_name || l.email}’s team</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting || !email}
              style={{ border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: inviting || !email ? 'default' : 'pointer', background: inviting || !email ? '#eef1f3' : ACCENT, color: inviting || !email ? '#a7aeb8' : '#fff' }}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: '#9aa3ad', marginTop: 10, lineHeight: 1.55 }}>
            They get a one-time link to set their own password, and start as a{' '}
            <strong style={{ color: '#6b7585' }}>Volunteer</strong>. Change their
            role below once they&apos;re in.
          </div>
        </form>
        )}

        {/* team list, one card per team */}
        {loading ? null : groups.map(g => (
          <div key={g.key} style={{ background: '#fff', border: `1px solid ${g.mine ? '#d9d2e4' : '#e6e9ee'}`, borderRadius: 13, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #eef1f3', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', background: g.mine ? '#faf9fc' : '#fff' }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 15.5, color: '#1d2733' }}>
                {g.title}
              </div>
              {g.mine && (
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: ACCENT_DARK, background: '#f0edf5', borderRadius: 5, padding: '2px 7px' }}>
                  YOURS
                </span>
              )}
              <span style={{ fontSize: 12.5, color: '#9aa3ad' }}>
                {g.rows.length} {g.rows.length === 1 ? 'person' : 'people'}
                {'note' in g && g.note ? ` · ${g.note}` : ''}
              </span>
            </div>

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="portal-team-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['Name', 'Title', 'Email', 'Role', 'Reports to', 'Can lead', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a93a0', padding: '12px 14px', borderBottom: '1px solid #e6e9ee', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map(p => {
                  const isMe = p.id === profile?.id;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eef1f3' }}>
                      <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: '#1d2733', minWidth: 180, whiteSpace: 'nowrap' }}>
                        {p.full_name || <span style={{ color: '#b8bfc7', fontWeight: 500 }}>Not set yet</span>}
                        {isMe && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: ACCENT_DARK, background: '#f0edf5', borderRadius: 5, padding: '2px 6px' }}>
                            You
                          </span>
                        )}
                        {p.created_at && (
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#9aa3ad', marginTop: 3 }}>
                            Member since {memberSince(p.created_at)}
                          </div>
                        )}
                        {awaysFor(p.id).map(a => (
                          <div key={a.id} style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#C2403F' }}>
                            Away {fmtSpan(a.start_date, a.end_date)}
                            {canRecordAway(asViewer, p) && (
                              <button
                                onClick={() => clearAway(a)}
                                title="Clear this away"
                                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#C2403F', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        ))}
                      </td>
                      {/* title shown in email signatures */}
                      <td style={{ padding: '12px 14px' }}>
                        {canManage ? (
                          <input
                            // shows the role name when empty
                            key={`${p.id}:${p.role}`}
                            defaultValue={p.title || ROLE_LABEL[p.role]}
                            onBlur={e => saveTitle(p, e.target.value)}
                            style={{ ...field, padding: '7px 9px', fontSize: 13, width: 150, minWidth: 130, color: p.title ? '#1d2733' : '#6b7585' }}
                          />
                        ) : (
                          <span style={{ fontSize: 13.5, color: p.title ? '#4b5563' : '#6b7585' }}>
                            {p.title || ROLE_LABEL[p.role]}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13.5, color: '#6b7585', whiteSpace: 'nowrap' }}>{p.email}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {canManage ? (
                          <select
                            value={p.role}
                            onChange={e => changeRole(p.id, e.target.value as Role)}
                            // you can't change your own role
                            disabled={isMe}
                            title={isMe ? 'You can’t change your own role' : undefined}
                            style={{ ...field, padding: '7px 9px', fontSize: 13, cursor: isMe ? 'default' : 'pointer', color: isMe ? '#a7aeb8' : '#1d2733', minWidth: 150 }}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: 13.5, color: '#4b5563' }}>{ROLE_LABEL[p.role]}</span>
                        )}
                      </td>

                      {/* their lead */}
                      <td style={{ padding: '12px 14px' }}>
                        {p.role !== 'volunteer' ? (
                          <span style={{ fontSize: 12.5, color: '#c3c9d0' }}>-</span>
                        ) : canManage ? (
                          <select
                            value={p.lead_id ?? ''}
                            onChange={e => changeLead(p, e.target.value || null)}
                            style={{ ...field, padding: '7px 9px', fontSize: 13, cursor: 'pointer', minWidth: 150 }}
                          >
                            <option value="">Unassigned</option>
                            {leads.map(l => (
                              <option key={l.id} value={l.id}>{l.full_name || l.email}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: 13.5, color: p.lead_id ? '#4b5563' : '#c3c9d0' }}>
                            {people.find(l => l.id === p.lead_id)?.full_name || (p.lead_id ? '-' : 'Unassigned')}
                          </span>
                        )}
                      </td>

                      {/* can lead a workshop. volunteers only. */}
                      <td style={{ padding: '12px 14px' }}>
                        {p.role !== 'volunteer' ? (
                          <span style={{ fontSize: 12.5, color: '#c3c9d0' }}>-</span>
                        ) : canGraduate(p) ? (
                          <button
                            onClick={() => toggleGraduated(p)}
                            title={p.graduated
                              ? 'Can lead a workshop, so a day they’re free counts as staffable. Click to undo.'
                              : 'Can help at a workshop but not lead one. Click once their lead judges them ready.'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 7,
                              border: 'none', background: 'none', padding: 0,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <span style={{
                              width: 34, height: 20, borderRadius: 999, padding: 2,
                              background: p.graduated ? '#2BA55F' : '#d8dde3',
                              display: 'inline-flex', justifyContent: p.graduated ? 'flex-end' : 'flex-start',
                              transition: 'background .12s',
                            }}>
                              <span style={{ width: 16, height: 16, borderRadius: 999, background: '#fff' }} />
                            </span>
                            <span style={{ fontSize: 12.5, color: p.graduated ? '#1E7A44' : '#8a93a0', fontWeight: 600 }}>
                              {p.graduated ? 'Yes' : 'Not yet'}
                            </span>
                          </button>
                        ) : (
                          // read only if you can't change it
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: p.graduated ? '#1E7A44' : '#8a93a0' }}>
                            {p.graduated ? 'Yes' : 'Supervised'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: 220 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'nowrap' }}>
                        {canRecordAway(asViewer, p) && (
                          <button
                            onClick={() => openAway(p)}
                            style={{ border: '1px solid #F2C9C9', background: '#fff', color: '#C2403F', borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Mark away
                          </button>
                        )}
                        {canManage && !isMe && (
                          <button
                            onClick={() => { setRemoving(p); setConfirmText(''); }}
                            title="Remove this person"
                            style={{ border: '1px solid #F2C9C9', background: '#fff', color: '#C2403F', borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Remove
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        ))}
      </div>

      {/* type the email to confirm removal */}
      {removing && (
        <div
          onClick={() => !removingBusy && setRemoving(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.4)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: '24px 24px 20px', boxShadow: '0 20px 60px -20px rgba(15,23,30,.4)' }}
          >
            <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 18, marginBottom: 8, color: '#C2403F' }}>
              Remove {removing.full_name || removing.email}?
            </div>

            <div style={{ fontSize: 13.5, color: '#4b5563', lineHeight: 1.6, marginBottom: 14 }}>
              This permanently deletes:
            </div>
            <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13.5, color: '#4b5563', lineHeight: 1.8 }}>
              <li>Their account and sign-in</li>
              <li>Every hour of availability they have entered</li>
              <li>Their history on past calendars</li>
            </ul>
            <div style={{ fontSize: 13, color: '#9A6A00', background: '#FEF4E0', borderRadius: 9, padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
              This cannot be undone. To keep their history, change their role instead.
            </div>

            <label htmlFor="confirm-remove" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
              Type <strong>{removing.email}</strong> to confirm
            </label>
            <input
              id="confirm-remove"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoFocus
              autoComplete="off"
              style={{ width: '100%', border: '1px solid #d8dde3', borderRadius: 9, padding: '9px 11px', fontSize: 14, fontFamily: 'inherit', color: '#1d2733', outline: 'none', marginBottom: 18, boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRemoving(null)}
                disabled={removingBusy}
                style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '9px 15px', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: '#4b5563' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRemovingBusy(true);
                  await removeUser(removing);
                  setRemovingBusy(false);
                }}
                disabled={removingBusy || confirmText.trim().toLowerCase() !== removing.email.toLowerCase()}
                style={{
                  border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13.5,
                  fontWeight: 700, fontFamily: 'inherit',
                  background: removingBusy || confirmText.trim().toLowerCase() !== removing.email.toLowerCase() ? '#eef1f3' : '#C2403F',
                  color: removingBusy || confirmText.trim().toLowerCase() !== removing.email.toLowerCase() ? '#a7aeb8' : '#fff',
                  cursor: removingBusy || confirmText.trim().toLowerCase() !== removing.email.toLowerCase() ? 'default' : 'pointer',
                }}
              >
                {removingBusy ? 'Removing…' : 'Remove permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {awayDraft && (
        <div
          onClick={() => { if (!awaySaving) setAwayDraft(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,30,.4)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 14, padding: '24px 24px 20px', boxShadow: '0 20px 60px -20px rgba(15,23,30,.4)' }}
          >
            <div style={{ fontFamily: 'var(--font-nunito)', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
              Mark {awayDraft.person.full_name || awayDraft.person.email} away
            </div>
            <div style={{ fontSize: 13.5, color: '#6b7585', marginBottom: 12, lineHeight: 1.55 }}>
              This shows on the team calendar and locks those days on their availability. Their hours in that span are cleared.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {(() => {
                const now = new Date();
                // allow the full booking window
                const months = Array.from({ length: MONTHS_AHEAD + 1 }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                  // no past dates
                  const partial = i === 0 && now.getDate() > 1;
                  return {
                    label: `${partial ? 'Rest of' : 'All of'} ${d.toLocaleDateString(undefined, { month: 'long' })}`,
                    start: dateKey(partial ? now : d),
                    end: dateKey(last),
                  };
                });
                return months.map(m => (
                  <button
                    key={m.start}
                    type="button"
                    onClick={() => setAwayDraft({ ...awayDraft, start: m.start, end: m.end })}
                    style={{ border: '1px solid #d8dde3', background: awayDraft.start === m.start && awayDraft.end === m.end ? '#f0edf5' : '#fff', color: ACCENT_DARK, borderRadius: 8, padding: '6px 11px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    {m.label}
                  </button>
                ));
              })()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7585' }}>
                From
                <input
                  type="date"
                  value={awayDraft.start}
                  min={awayWindow().min}
                  max={awayWindow().max}
                  onChange={e => setAwayDraft({ ...awayDraft, start: e.target.value })}
                  style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #d8dde3', borderRadius: 9, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13.5 }}
                />
              </label>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7585' }}>
                To
                <input
                  type="date"
                  value={awayDraft.end}
                  min={awayDraft.start || awayWindow().min}
                  max={awayWindow().max}
                  onChange={e => setAwayDraft({ ...awayDraft, end: e.target.value })}
                  style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #d8dde3', borderRadius: 9, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13.5 }}
                />
              </label>
            </div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7585', marginBottom: 16 }}>
              Note
              <span style={{ fontWeight: 500, color: '#c3c9d0' }}> (optional)</span>
              <textarea
                value={awayDraft.reason}
                onChange={e => setAwayDraft({ ...awayDraft, reason: e.target.value })}
                rows={2}
                placeholder="Shown on the calendar"
                style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #d8dde3', borderRadius: 9, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13.5, resize: 'vertical', lineHeight: 1.5 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAwayDraft(null)}
                disabled={awaySaving}
                style={{ border: '1px solid #d8dde3', background: '#fff', borderRadius: 9, padding: '9px 15px', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: '#4b5563' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { void submitAway(); }}
                disabled={awaySaving}
                style={{ border: 'none', background: '#C2403F', color: '#fff', borderRadius: 9, padding: '9px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: awaySaving ? 'default' : 'pointer' }}
              >
                {awaySaving ? 'Saving…' : 'Mark away'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
