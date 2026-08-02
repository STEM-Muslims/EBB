/** Anything carrying an identity we might render: users, assignees, uploaders. */
export interface NamedUser {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

/** "First Last", or whichever half is on record; null when neither is. */
export function fullName(u: NamedUser): string | null {
  const name = [u.first_name, u.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

/** What to show wherever a person appears — their name, else their email. */
export function displayName(u: NamedUser): string {
  return fullName(u) ?? u.email;
}

/** Avatar initials: "FL" from the name, else the first letter of the email. */
export function initials(u: NamedUser): string {
  const first = u.first_name?.trim();
  const last = u.last_name?.trim();
  if (first || last) {
    return `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase();
  }
  return u.email.charAt(0).toUpperCase();
}
