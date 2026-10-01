/** Subtitle under a portal team member name: designation (not ERP role). */

export function teamMemberRoleLabel(member: {
  userType?: string;
  user_type?: string;
  designation?: string | null;
  roles?: string[];
}): string {
  const designation = member.designation?.trim();
  if (designation) return designation;
  const userType = member.userType || member.user_type;
  if (userType === 'CLIENT') return 'Client';
  return '—';
}
