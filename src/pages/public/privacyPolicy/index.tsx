import React from 'react';
import { texailogo } from '@/assets/icons';

const LAST_UPDATED = 'September 22, 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-2 py-5 border-b border-gray-100 last:border-0">
    <h2 className="text-base font-black text-gray-900">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed flex flex-col gap-2">{children}</div>
  </section>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-5 py-12">
        <img src={texailogo} alt="TekXAI" className="h-8 mb-8" />
        <h1 className="text-2xl font-black text-gray-900 mb-1">TekXAI OS — Privacy Policy</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="Scope">
          <p>
            This policy covers TekXAI OS, TekXAI LLC&apos;s internal operations platform, and its integrations
            with third-party services such as Zoom Team Chat. TekXAI OS is used exclusively by TekXAI employees
            and is not available to the public.
          </p>
        </Section>

        <Section title="Zoom Team Chat integration">
          <p>
            When an employee connects their Zoom account from TekXAI OS, we request the following Zoom OAuth
            scopes, and only the following:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li><code className="text-xs">team_chat:read:list_user_channels</code> — list the Zoom Team Chat channels you belong to</li>
            <li><code className="text-xs">team_chat:read:list_user_messages</code> — read messages in those channels, to display them inside TekXAI OS</li>
            <li><code className="text-xs">team_chat:read:list_contacts</code> — list your Zoom contacts, to show conversation participants</li>
            <li><code className="text-xs">user:read:user</code> — read your basic Zoom profile (name, email) to link your Zoom account to your TekXAI OS account</li>
            <li><code className="text-xs">team_chat:write:user_message</code> — send messages on your behalf when you send a message from within TekXAI OS</li>
          </ul>
          <p>
            We do not request access to your Zoom Meetings, recordings, calendar, or any Zoom data outside Team
            Chat.
          </p>
        </Section>

        <Section title="How this data is used and stored">
          <p>
            Zoom access is used solely to display and send Team Chat messages inside TekXAI OS, as a convenience
            so employees don&apos;t need to switch applications. Your Zoom access and refresh tokens are encrypted
            at rest and stored against your own TekXAI OS user account — they are never shared with other
            employees or third parties.
          </p>
        </Section>

        <Section title="Disconnecting">
          <p>
            You can disconnect your Zoom account from TekXAI OS at any time from the Zoom Team Chat panel. This
            immediately revokes TekXAI OS&apos;s access to your Zoom account and deletes the stored tokens.
          </p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy can be directed to your TekXAI IT/HR administrator.</p>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
