// src/pages/legal/TermsOfUse.tsx
import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';

const TermsOfUse: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* SEO: safe to keep for title + social, but noindex this page */}
      <SEO
        title="FundRaisely Terms of Use"
        description="Read the Terms of Use for FundRaisely’s website, platform, and services."
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

        <h1 className="mb-6 text-3xl font-bold text-indigo-950">FundRaisely Terms of Use</h1>

        {/* 1 */}
        <section id="introduction" className="prose prose-indigo max-w-none">
          <h2>1. Introduction and Acceptance of Terms</h2>
          <p>
            Welcome to FundRaisely. These Terms of Use (“Terms”) govern your access to and use of the
            FundRaisely website, platform, and services (collectively, the “Service”). By accessing or
            using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do
            not agree to these Terms, you may not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and FundRaisely (“we,” “us,”
            or “our”). For the purposes of these Terms, “you” refers to you as a user of the Service,
            whether you are an event organizer, a participant, or a visitor.
          </p>
        </section>

        {/* 2 */}
        <section id="definitions" className="prose prose-indigo max-w-none">
          <h2>2. Definitions</h2>
          <p>
            “Service” refers to the FundRaisely website, platform, and all related services. “User”
            refers to any individual who accesses or uses the Service. “Organizer” refers to a User who
            creates and manages a fundraising event using the Service. “Participant” refers to a User who
            participates in an event, for example, by purchasing a ticket or playing a quiz. “Content”
            refers to all text, images, data, and other materials on the Service.
          </p>
        </section>

        {/* 3 */}
        <section id="eligibility" className="prose prose-indigo max-w-none">
          <h2>3. Eligibility and Account Registration</h2>
          <p>
            To use the Service, you must be at least 18 years old and have the legal capacity to enter
            into a binding contract. By creating an account, you represent and warrant that you meet
            these requirements.
          </p>
          <p>
            You are responsible for providing accurate and complete information when creating your
            account and for keeping your account information up-to-date. You are also responsible for
            maintaining the confidentiality of your account password and for all activities that occur
            under your account. You agree to notify us immediately of any unauthorized use of your
            account.
          </p>
        </section>

        {/* 4 */}
        <section id="availability" className="prose prose-indigo max-w-none">
          <h2>4. Service Availability and Performance</h2>
          <p>
            We strive to provide reliable and continuous access to our Service. However, we do not
            guarantee that the Service will be available at all times or that it will be uninterrupted or
            error-free. We may suspend or restrict access to the Service for maintenance, updates, or
            other operational reasons.
          </p>
          <p>
            We are not liable for any loss or damage resulting from service interruptions, including
            those caused by force majeure events such as natural disasters, government actions, or
            circumstances beyond our reasonable control.
          </p>
        </section>

        {/* 5 */}
        <section id="payments" className="prose prose-indigo max-w-none">
          <h2>5. Payment Methods and Financial Terms</h2>
          <p>
            FundRaisely offers multiple ways to process payments for fundraising events. By using our
            payment services, you agree to the terms of our third-party payment processors.
          </p>

          <h3>a. Traditional Payments</h3>
          <p>
            <strong>Cash Payments:</strong> For in-person events, Organizers may accept cash payments.
            The Organizer is solely responsible for the collection, reconciliation, and security of cash
            payments.
          </p>
          <p>
            <strong>Card Payments:</strong> We process card payments through Stripe. By using this
            service, you agree to Stripe’s terms of service. FundRaisely is not responsible for the
            performance of Stripe.
          </p>

          <h3>b. Cryptocurrency Payments</h3>
          <p>
            <strong>Crypto Payments:</strong> We partner with Glo Dollar and The Giving Block to
            facilitate cryptocurrency payments. The specific cryptocurrencies accepted may vary
            depending on the blockchain selected for the event.
          </p>
          <p>
            <strong>Digital Asset Prizes:</strong> Prizes for events may include digital blockchain
            assets. The value of such assets may be volatile, and FundRaisely is not responsible for any
            fluctuations in value.
          </p>
          <p>
            <strong>Blockchain Transactions:</strong> All cryptocurrency transactions are recorded on a
            public blockchain. These transactions are irreversible, and FundRaisely has no control over
            the blockchain network.
          </p>

          <h3>c. Refunds and Cancellations</h3>
          <p>
            Refund policies for individual events are set by the Organizer and will be clearly displayed
            during the registration process. FundRaisely does not guarantee refunds for participant fees.
            For events cancelled by the Organizer, participants should contact the Organizer directly
            regarding refunds. We reserve the right to process refunds in cases of technical failures or
            service errors at our discretion.
          </p>
        </section>

        {/* 6 */}
        <section id="data-rights" className="prose prose-indigo max-w-none">
          <h2>6. Data Ownership and Content Rights</h2>

          <h3>a. Your Content</h3>
          <p>
            You retain ownership of any content you create or upload to the Service, including event
            descriptions, images, and participant data. However, you grant us a worldwide, royalty-free,
            non-exclusive license to use, reproduce, modify, and display your content in connection with
            providing the Service.
          </p>

          <h3>b. Event Data</h3>
          <p>
            Event data, including participant information, quiz results, and financial records, remains
            under the control of the Organizer. We act as a data processor for this information and will
            provide data export capabilities upon request. You are responsible for ensuring compliance
            with applicable data protection laws regarding participant information.
          </p>

          <h3>c. Platform Data</h3>
          <p>
            We retain ownership of all platform-generated data, including analytics, usage patterns, and
            aggregated performance metrics. This data may be used to improve our Service and develop new
            features.
          </p>
        </section>

        {/* 7 */}
        <section id="ip" className="prose prose-indigo max-w-none">
          <h2>7. Intellectual Property</h2>
          <p>
            All Content on the Service, including text, graphics, logos, and software, is the property
            of FundRaisely or its licensors and is protected by copyright, trademark, and other
            intellectual property laws. You are granted a limited, non-exclusive, non-transferable
            license to access and use the Service for its intended purpose.
          </p>
          <p>
            You may not reproduce, distribute, modify, or create derivative works of the Content without
            our prior written consent.
          </p>
        </section>

        {/* 8 */}
        <section id="acceptable-use" className="prose prose-indigo max-w-none">
          <h2>8. Acceptable Use and Prohibited Activities</h2>
          <ul>
            <li>
              Engaging in any fraudulent activity, including misrepresenting your identity or the
              purpose of your fundraising event.
            </li>
            <li>Uploading or transmitting any material that is defamatory, obscene, or offensive.</li>
            <li>
              Using the Service to conduct any activity that would violate applicable laws or
              regulations, including those related to gambling or financial services.
            </li>
            <li>
              Attempting to interfere with the proper working of the Service, including by introducing
              viruses, trojans, or other malicious code.
            </li>
            <li>
              Using the Service for any commercial purpose other than legitimate fundraising activities.
            </li>
          </ul>
        </section>

        {/* 9 */}
        <section id="termination" className="prose prose-indigo max-w-none">
          <h2>9. Account Termination and Suspension</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without
            notice, if we believe you have violated these Terms or engaged in conduct that we deem
            inappropriate or harmful to the Service or other users.
          </p>
          <p>
            You may terminate your account at any time by contacting us at{' '}
            <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>. Upon termination,
            your access to the Service will cease, but these Terms will continue to apply to your prior
            use of the Service.
          </p>
          <p>
            Following account termination, we will retain your data in accordance with our Privacy Policy
            and applicable legal requirements. You may request data export before termination.
          </p>
        </section>

        {/* 10 */}
        <section id="third-parties" className="prose prose-indigo max-w-none">
          <h2>10. Third-Party Services and Integrations</h2>
          <p>
            Our Service integrates with various third-party services, including payment processors,
            blockchain networks, and analytics providers. We are not responsible for the availability,
            performance, or policies of these third-party services. Your use of third-party services is
            subject to their respective terms and conditions.
          </p>
        </section>

        {/* 11 */}
        <section id="communications" className="prose prose-indigo max-w-none">
          <h2>11. Communications and Notifications</h2>
          <p>
            By using our Service, you consent to receive communications from us via email, including
            service announcements, security alerts, and account notifications. You may opt out of
            non-essential communications through your account settings or by contacting us directly.
          </p>
          <p>
            We will deliver important notices regarding changes to these Terms or our Privacy Policy
            through email and prominent website notifications.
          </p>
        </section>

        {/* 12 */}
        <section id="compliance" className="prose prose-indigo max-w-none">
          <h2>12. Compliance and Regulatory Obligations</h2>
          <p>
            As a fundraising platform, we are committed to compliance with applicable laws and
            regulations. Organizers are responsible for ensuring their events comply with local
            fundraising regulations, charity laws, and tax requirements.
          </p>
          <p>
            We reserve the right to request additional documentation or information to verify compliance
            and may suspend events that do not meet regulatory standards.
          </p>
        </section>

        {/* 13 */}
        <section id="disclaimers" className="prose prose-indigo max-w-none">
          <h2>13. Disclaimers and Limitation of Liability</h2>
          <p>
            The Service is provided on an “as is” and “as available” basis. We make no warranties,
            express or implied, regarding the operation or availability of the Service, or that the
            Service will be uninterrupted or error-free. To the fullest extent permitted by law, we
            disclaim all warranties, including warranties of merchantability, fitness for a particular
            purpose, and non-infringement.
          </p>
          <p>
            In no event will FundRaisely be liable for any indirect, incidental, special, or
            consequential damages arising out of or in connection with your use of the Service, including
            but not limited to, loss of profits, data, or goodwill. Our total liability to you for any
            and all claims arising out of your use of the Service will not exceed the total amount of fees
            paid by you to us in the 12 months preceding the claim.
          </p>
        </section>

        {/* 14 */}
        <section id="dispute-resolution" className="prose prose-indigo max-w-none">
          <h2>14. Dispute Resolution</h2>
          <p>
            In the event of any dispute arising from these Terms or your use of the Service, we
            encourage you to first contact us at{' '}
            <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a> to seek an amicable
            resolution.
          </p>
          <p>
            If a dispute cannot be resolved through direct communication, both parties agree to attempt
            resolution through mediation before pursuing formal legal proceedings.
          </p>
        </section>

        {/* 15 */}
        <section id="governing-law" className="prose prose-indigo max-w-none">
          <h2>15. Governing Law and Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of England and
            Wales. Any disputes arising under or in connection with these Terms shall be subject to the
            exclusive jurisdiction of the courts of England and Wales.
          </p>
          <p>
            For users in the Republic of Ireland, these Terms shall be governed by and construed in
            accordance with the laws of Ireland, and any disputes shall be subject to the exclusive
            jurisdiction of the courts of Ireland.
          </p>
        </section>

        {/* 16 */}
        <section id="changes" className="prose prose-indigo max-w-none">
          <h2>16. Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of any material
            changes by posting the new Terms on our website, updating the “Last Updated” date, and
            sending an email notification to your registered email address.
          </p>
          <p>
            Your continued use of the Service after any such changes constitutes your acceptance of the
            new Terms. If you do not agree to the modified Terms, you must stop using the Service.
          </p>
        </section>

        {/* 17 */}
        <section id="contact" className="prose prose-indigo max-w-none">
          <h2>17. Contact Information</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <ul>
            {/* <li>
              Email:{' '}
              <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>
            </li>
            <li>
              Support:{' '}
              <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>
            </li> */}
            <li>
              Address: The Professional Training Academy Limited T/A Fundraisely. Unit 3E Deerpark
              Business Centre, Oranmore Co Galway.
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default TermsOfUse;
