/** Age groups the public form and the admin bookings page both offer. */
export const AGE_GROUPS = ['Primary', 'Intermediate'] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
