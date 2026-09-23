import React from 'react';
import { texailogo } from '@/assets/icons';

const LAST_UPDATED = 'September 22, 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-2 py-5 border-b border-gray-100 last:border-0">
    <h2 className="text-base font-black text-gray-900">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed flex flex-col gap-2">{children}</div>
  </section>
);

const TermsOfUsePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-5 py-12">
        <img src={texailogo} alt="TekXAI" className="h-8 mb-8" />
        <h1 className="text-2xl font-black text-gray-900 mb-1">TekXAI OS — Terms of Use</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="Internal use only">
          <p>
            TekXAI OS is an internal operations platform provided by TekXAI LLC solely for use by its own
            employees and authorized contractors, in the course of their work. It is not offered to the public
            or to any external organization.
          </p>
        </Section>

        <Section title="Third-party integrations">
          <p>
            TekXAI OS integrates with third-party services, including Zoom Team Chat, to let employees use those
            services without leaving TekXAI OS. Connecting a third-party account is optional and requires your
            explicit authorization through that provider&apos;s own consent flow. Your use of Zoom remains subject
            to Zoom&apos;s own Terms of Service.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            TekXAI OS and any connected third-party accounts may be used only for legitimate business purposes
            consistent with TekXAI&apos;s internal policies. Employees are responsible for the content they send
            or access through connected integrations, exactly as if sent directly through the underlying service.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            These terms may be updated from time to time to reflect changes to TekXAI OS or its integrations.
            Continued use after an update constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>Questions about these terms can be directed to your TekXAI IT/HR administrator.</p>
        </Section>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
