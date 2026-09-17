/** Role permissions for the portal UI. The database has its own rules in `supabase/schema.sql`. */

/** All roles. Matches the `user_role` enum in the database. */
export type Role =
  | 'volunteer'
  | 'workshop_lead'
  | 'outreach_lead'
  | 'comms_lead'
  | 'president'
  | 'admin';

/** All permissions. */
export type Permission =
  | 'view:calendar'
  | 'edit:own-availability'
  | 'view:all-availability'
  | 'view:bookings'
  | 'manage:bookings'
  | 'view:newsletter'
  | 'view:messages'
  /** See the team list. */
  | 'view:volunteers'
  /** Mark a volunteer as able to lead a workshop. */
  | 'manage:graduation'
  /** Invite, change and remove people. */
  | 'manage:users';

/** Everyone can see the calendar and enter their hours. */
const VOLUNTEER: Permission[] = ['view:calendar', 'edit:own-availability'];

/** Permissions all execs share. */
const EXEC: Permission[] = [...VOLUNTEER, 'view:all-availability'];

/** Presidents and admins. */
const EVERYTHING: Permission[] = [
  ...EXEC,
  'view:bookings',
  'manage:bookings',
  'view:messages',
  'view:newsletter',
  'view:volunteers',
  'manage:graduation',
  'manage:users',
];

/** Permissions for each role. */
const PERMISSIONS: Record<Role, Permission[]> = {
  volunteer: VOLUNTEER,
  // leads can see the team list but can't change roles
  workshop_lead: [...EXEC, 'view:bookings', 'manage:bookings', 'view:messages', 'view:volunteers', 'manage:graduation'],
  outreach_lead: [...EXEC, 'view:bookings', 'manage:bookings', 'view:messages', 'view:volunteers', 'manage:graduation'],
  // comms handles newsletters, not bookings. they can graduate their own volunteers.
  comms_lead: [...EXEC, 'view:newsletter', 'view:volunteers', 'manage:graduation'],
  president: EVERYTHING,
  admin: EVERYTHING,
};

/** True if the role has the permission. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Readable role name. */
export const ROLE_LABEL: Record<Role, string> = {
  volunteer: 'Volunteer',
  workshop_lead: 'Workshop Team Lead',
  outreach_lead: 'Outreach Lead',
  comms_lead: 'Communications Lead',
  president: 'President',
  admin: 'Admin',
};

/** True if the person can lead a workshop. Execs always can, volunteers once graduated. */
export function canLead(p: Pick<Profile, 'role' | 'graduated'>): boolean {
  return p.role !== 'volunteer' || p.graduated;
}

/** A row from the `profiles` table. */
export type Profile = {
  /** Same as the auth user id. */
  id: string;
  /** The name they set. */
  full_name: string;
  email: string;
  role: Role;
  /** Title for email signatures. Empty uses the role name. */
  title: string;
  /** The exec they report to, or null. */
  lead_id: string | null;
  /** See {@link canLead}. Volunteers only. */
  graduated: boolean;
  active: boolean;
  /** When the profile was created. */
  created_at: string;
};

/** Month and year they joined, like "August 2026". */
export function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Admin pages and the permission each needs. The order sets the sidebar order. */
export const ADMIN_ROUTES: { href: string; label: string; permission: Permission }[] = [
  { href: '/admin/calendar', label: 'Calendar', permission: 'view:calendar' },
  // entering your own hours
  { href: '/admin/availability', label: 'My Availability', permission: 'edit:own-availability' },
  { href: '/admin/bookings', label: 'Bookings', permission: 'view:bookings' },
  { href: '/admin/messages', label: 'Messages', permission: 'view:messages' },
  // for the comms lead
  { href: '/admin/newsletter', label: 'Newsletter', permission: 'view:newsletter' },
  // leads see it read only
  { href: '/admin/team', label: 'Team', permission: 'view:volunteers' },
];

/** First page the role can open, or null if none. */
export function landingRoute(role: Role | null | undefined): string | null {
  return ADMIN_ROUTES.find(r => can(role, r.permission))?.href ?? null;
}

/** True if the viewer can mark `target` as away. */
export function canRecordAway(
  viewer: Pick<Profile, 'id' | 'role'> | null | undefined,
  target: Pick<Profile, 'id' | 'lead_id'>,
): boolean {
  if (!viewer) return false;
  if (can(viewer.role, 'manage:users')) return true;
  if (can(viewer.role, 'manage:graduation') && target.lead_id === viewer.id) return true;
  if (can(viewer.role, 'view:all-availability') && target.id === viewer.id) return true;
  return false;
}
