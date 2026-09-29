import { Navigate } from 'react-router-dom';

/** People moved into Client CRM — keep old URL working. */
export default function PortalInvitesRedirect() {
  return <Navigate to="/portal/crm?tab=people" replace />;
}
