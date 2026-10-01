/** Subtitle under a portal team member name: Client, designation, or ERP role. */

function formatRoleName(role: string): string {
  return role
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function teamMemberRoleLabel(member: {
  userType?: string;
  user_type?: string;
  designation?: string | null;
  roles?: string[];
}): string {
  const userType = member.userType || member.user_type;
  if (userType === 'CLIENT') return 'Client';
  if (member.designation?.trim()) return member.designation.trim();
  const role = (member.roles || []).find(Boolean);
  if (role) return formatRoleName(role);
  return 'Team';
}
