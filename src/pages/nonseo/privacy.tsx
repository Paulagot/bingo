// src/pages/legal/PrivacyPolicy.tsx
import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SEO
        title="FundRaisely Privacy Policy"
        description="How FundRaisely collects, uses, stores, and protects your personal data under UK/EU GDPR."
        type="legal"
        // robots="noindex, nofollow"
      />
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
            Last Updated: 3 October 2025
          </span>
        </div>

        <h1 className="mb-6 text-3xl font-bold text-indigo-950">FundRaisely Privacy Policy</h1>

        <section className="prose prose-indigo max-w-none">
          <h2>Our Commitment to Your Privacy</h2>
          <p>
            Welcome to FundRaisely. We are committed to protecting the privacy and security of your personal
            data. This Privacy Policy explains how we collect, use, store, and protect your information when
            you use our website and services. It also outlines your rights under the UK General Data
            Protection Regulation (UK GDPR), the EU General Data Protection Regulation (EU GDPR), and other
            relevant data protection laws in the UK and Ireland.
          </p>
          <p>
            FundRaisely (“we,” “us,” or “our”) acts as the data controller for the personal data we process.
            Our registered office is The Professional Training Academy Limited T/A Fundraisely, Unit 3E
            Deerpark Business Centre, Oranmore, Co Galway. For any data protection inquiries, please contact
            us at <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>.
          </p>
        </section>

        <section id="info-we-collect" className="prose prose-indigo max-w-none">
          <h2>1. What Information We Collect</h2>
          <h3>a. Information You Provide to Us</h3>
          <ul>
            <li>
              <strong>Account Information:</strong> When you create a FundRaisely account, we collect your
              name, email address, and password.
            </li>
            <li>
              <strong>Event Information:</strong> When you create a fundraising event, we collect details
              about the event, including its name, date, and the organization it supports.
            </li>
            <li>
              <strong>Payment Information:</strong> For event organizers, we collect payment details to
              process payouts. For participants, we process payments through our secure third-party payment
              processors, Stripe (card payments) and The Giving Block (cryptocurrency payments). We do not
              store your full credit card or crypto wallet details.
            </li>
            <li>
              <strong>Communications:</strong> If you contact us for support or feedback, we collect the
              information you provide in your communications.
            </li>
          </ul>

          <h3>b. Information We Collect Automatically</h3>
          <ul>
            <li>
              <strong>Usage Data:</strong> Information about how you use our platform, including pages
              visited, features used, and actions taken.
            </li>
            <li>
              <strong>Device and Connection Information:</strong> IP address, browser type, operating
              system, and device identifiers.
            </li>
            <li>
              <strong>Cookies:</strong> We use cookies and similar technologies to operate and improve our
              services. See <a href="#cookies">Cookie Policy</a> below.
            </li>
          </ul>
        </section>

        <section id="how-we-use" className="prose prose-indigo max-w-none">
          <h2>2. How We Use Your Information</h2>
          <p>We use your personal data for the following purposes, based on a lawful basis for processing:</p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Purpose of Processing</th>
                  <th className="px-4 py-3 font-semibold">Lawful Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3">To provide and manage your account and our services</td>
                  <td className="px-4 py-3">Performance of a contract</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To process payments and payouts</td>
                  <td className="px-4 py-3">Performance of a contract</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To communicate with you about your account and our services</td>
                  <td className="px-4 py-3">Performance of a contract; Legitimate interest</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To provide customer support and respond to inquiries</td>
                  <td className="px-4 py-3">Legitimate interest</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To improve and personalize our platform and services</td>
                  <td className="px-4 py-3">Legitimate interest</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To ensure the security and integrity of our platform</td>
                  <td className="px-4 py-3">Legitimate interest; Legal obligation</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To comply with legal and regulatory obligations</td>
                  <td className="px-4 py-3">Legal obligation</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">To send you marketing communications (with your consent)</td>
                  <td className="px-4 py-3">Consent</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="sharing" className="prose prose-indigo max-w-none">
          <h2>3. How We Share Your Information</h2>
          <p>We do not sell your personal data. We may share your information with:</p>
          <ul>
            <li>
              <strong>Event Organizers:</strong> Participant information (e.g., name and team name) for
              events you participate in.
            </li>
            <li>
              <strong>Payment Processors:</strong> Transaction information with Stripe and The Giving Block
              to process payments securely.
            </li>
            <li>
              <strong>Service Providers:</strong> Hosting, analytics, and other providers under contracts
              requiring data protection.
            </li>
            <li>
              <strong>Legal and Regulatory Authorities:</strong> Where required by law or to protect our
              legal rights.
            </li>
          </ul>
        </section>

        <section id="storage-retention-transfers" className="prose prose-indigo max-w-none">
          <h2>4. Data Storage, Retention, and International Transfers</h2>
          <p>
            <strong>Data Storage:</strong> Your personal data is stored on secure servers primarily within
            the UK and the European Economic Area (EEA).
          </p>
          <p>
            <strong>Data Retention:</strong> We retain your personal data for as long as necessary to
            provide our services and fulfill our legal obligations. We will retain your account information
            for as long as your account is active and for a period of 6 years thereafter for legal and audit
            purposes.
          </p>
          <p>
            <strong>International Transfers:</strong> Where we transfer your data outside the UK/EEA, we
            ensure appropriate safeguards (e.g., Standard Contractual Clauses) are in place.
          </p>
        </section>

        <section id="your-rights" className="prose prose-indigo max-w-none">
          <h2>5. Your Data Protection Rights</h2>
          <p>Under GDPR, you have the following rights:</p>
          <ul>
            <li><strong>Right of Access</strong> – request a copy of your personal data.</li>
            <li><strong>Right to Rectification</strong> – correct inaccurate personal data.</li>
            <li>
              <strong>Right to Erasure (‘Right to be Forgotten’)</strong> – erase personal data in certain
              circumstances.
            </li>
            <li>
              <strong>Right to Restrict Processing</strong> – request restriction of processing in certain
              cases.
            </li>
            <li>
              <strong>Right to Data Portability</strong> – receive your data in a structured, commonly used,
              machine-readable format.
            </li>
            <li>
              <strong>Right to Object</strong> – object to processing in certain cases.
            </li>
            <li>
              <strong>Rights related to Automated Decision-Making</strong> – not to be subject to a decision
              based solely on automated processing.
            </li>
          </ul>
          <p>
            To exercise these rights, contact us at{' '}
            <a href="mailto:dpo@fundraisely.co.uk">dpo@fundraisely.co.uk</a>. You also have the right to
            lodge a complaint with a supervisory authority, such as the UK’s Information Commissioner’s
            Office (ICO).
          </p>
        </section>

        <section id="cookies" className="prose prose-indigo max-w-none">
          <h2>6. Cookie Policy</h2>
          <p>We use cookies to improve your experience on our platform:</p>
          <ul>
            <li>
              <strong>Strictly Necessary Cookies:</strong> Essential for site operation.
            </li>
            <li>
              <strong>Performance Cookies:</strong> Help us understand how visitors use our site.
            </li>
            <li>
              <strong>Functionality Cookies:</strong> Remember your preferences for a more personalized
              experience.
            </li>
          </ul>
          <p>
            You can manage cookie preferences via your browser settings. Disabling some cookies may affect
            site functionality.
          </p>
        </section>

        <section id="changes" className="prose prose-indigo max-w-none">
          <h2>7. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any significant
            changes by posting the new policy on our website and updating the “Last Updated” date. We
            encourage you to review this policy periodically.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PrivacyPolicy;
