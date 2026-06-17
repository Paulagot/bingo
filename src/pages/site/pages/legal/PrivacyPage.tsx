// src/pages/site/legal/PrivacyPage.tsx

import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="site-shell legal-page__shell">
        <p className="eyebrow">Legal</p>

        <h1>Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: [insert date]</p>

        <p>
          FundRaisely is operated by <strong>The Professional Training Academy Limited T/A FundRaisely</strong>,
          Unit 3E Deerpark Business Centre, Oranmore, Co. Galway.
        </p>

        <p>
          We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how
          we collect, use, store and share personal data when you use the FundRaisely website, platform, event pages,
          ticketing pages, fundraising tools and related services.
        </p>

        <p>
          For data protection questions, contact us at{' '}
          <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>.
        </p>

        <section>
          <h2>1. Who this policy applies to</h2>

          <p>This policy applies to:</p>

          <ul>
            <li>visitors to our website;</li>
            <li>people who create a FundRaisely account;</li>
            <li>clubs, schools, charities, PTAs, community groups and other organisations using FundRaisely;</li>
            <li>event organisers, hosts, admins and volunteers;</li>
            <li>supporters, attendees, ticket buyers, players and donors who interact with a FundRaisely page or event;</li>
            <li>people who contact us for support, demos or general enquiries.</li>
          </ul>
        </section>

        <section>
          <h2>2. Our role under data protection law</h2>

          <p>
            FundRaisely may act as a <strong>data controller</strong> or a <strong>data processor</strong>, depending on
            the situation.
          </p>

          <p>
            We act as a data controller where we decide why and how personal data is used, such as when we manage
            FundRaisely accounts, operate our website, communicate with users, provide support, manage billing, improve
            our services, and comply with legal obligations.
          </p>

          <p>
            Where an organisation uses FundRaisely to manage its own fundraising activity, event, ticketing page,
            supporter list or payment records, that organisation may be the data controller for the personal data
            collected for that activity. In those cases, FundRaisely may act as a data processor on behalf of the
            organisation.
          </p>
        </section>

        <section>
          <h2>3. Personal data we collect</h2>

          <h3>Information you provide to us</h3>

          <p>We may collect the following information when you use FundRaisely:</p>

          <ul>
            <li>name;</li>
            <li>email address;</li>
            <li>phone number, where provided;</li>
            <li>account login details;</li>
            <li>organisation, club, school, charity or group name;</li>
            <li>event, campaign or fundraising activity details;</li>
            <li>team names, player names or attendee names;</li>
            <li>ticket purchase details;</li>
            <li>donation or supporter details;</li>
            <li>payment status and reconciliation notes;</li>
            <li>admin, volunteer or host information;</li>
            <li>messages, support requests, feedback or enquiry form submissions.</li>
          </ul>

          <h3>Payment-related information</h3>

          <p>
            FundRaisely may help organisers collect, track or reconcile payments for events and fundraising activities.
          </p>

          <p>Depending on the payment method selected, payment-related data may include:</p>

          <ul>
            <li>payment method selected;</li>
            <li>payment reference;</li>
            <li>payment status, such as expected, claimed, confirmed, late, disputed or written off;</li>
            <li>ticket or order amount;</li>
            <li>transaction confirmation details;</li>
            <li>limited payment metadata returned by payment providers.</li>
          </ul>

          <p>
            Card payments and other online payments may be processed by third-party payment providers such as Stripe or
            other providers used by the relevant organiser or FundRaisely. We do not store full card details.
          </p>

          <p>
            Where crypto payments are supported, we may process wallet addresses, transaction hashes, token details,
            chain information and payment confirmation data. Public blockchain transactions may be visible on the
            relevant blockchain.
          </p>

          <h3>Information collected automatically</h3>

          <p>When you use our website or platform, we may collect:</p>

          <ul>
            <li>IP address;</li>
            <li>browser type;</li>
            <li>device type;</li>
            <li>operating system;</li>
            <li>pages visited;</li>
            <li>features used;</li>
            <li>date and time of access;</li>
            <li>approximate location based on IP address;</li>
            <li>cookies or similar technologies.</li>
          </ul>
        </section>

        <section>
          <h2>4. How we use personal data</h2>

          <p>We use personal data for the following purposes:</p>

          <div className="legal-page__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Lawful basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>To create and manage user accounts</td>
                  <td>Performance of a contract</td>
                </tr>
                <tr>
                  <td>To provide FundRaisely services to organisers and users</td>
                  <td>Performance of a contract</td>
                </tr>
                <tr>
                  <td>To create and manage events, campaigns, tickets, orders and supporter records</td>
                  <td>Performance of a contract; legitimate interests</td>
                </tr>
                <tr>
                  <td>To process, track or reconcile payments</td>
                  <td>Performance of a contract; legitimate interests; legal obligation</td>
                </tr>
                <tr>
                  <td>To provide customer support</td>
                  <td>Legitimate interests</td>
                </tr>
                <tr>
                  <td>To send service messages about accounts, events, payments or platform updates</td>
                  <td>Performance of a contract; legitimate interests</td>
                </tr>
                <tr>
                  <td>To improve and secure the platform</td>
                  <td>Legitimate interests</td>
                </tr>
                <tr>
                  <td>To prevent fraud, misuse or unauthorised access</td>
                  <td>Legitimate interests; legal obligation</td>
                </tr>
                <tr>
                  <td>To comply with accounting, tax, legal or regulatory obligations</td>
                  <td>Legal obligation</td>
                </tr>
                <tr>
                  <td>To send marketing communications where permitted</td>
                  <td>Consent or legitimate interests, depending on the circumstances</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            Where we rely on legitimate interests, we only do so where we believe our interests are not overridden by
            your rights and freedoms.
          </p>
        </section>

        <section>
          <h2>5. Sharing personal data</h2>

          <p>We do not sell personal data.</p>

          <p>We may share personal data with:</p>

          <h3>Event organisers and organisations</h3>

          <p>
            If you buy a ticket, join an event, make a donation, support a campaign or take part in a fundraising
            activity, relevant details may be shared with the organisation or organiser running that activity.
          </p>

          <p>
            This may include your name, order details, ticket details, team name, payment status or attendance/check-in
            status.
          </p>

          <h3>Payment providers</h3>

          <p>
            We may share payment-related information with payment providers, card processors, wallet/payment
            infrastructure providers, or banking/payment services used to process or confirm payments.
          </p>

          <h3>Service providers</h3>

          <p>
            We may use trusted service providers for hosting, email delivery, analytics, database services, security,
            customer support, and platform operations.
          </p>

          <p>
            These providers may only use personal data as instructed by us and must protect it appropriately.
          </p>

          <h3>Legal or regulatory authorities</h3>

          <p>
            We may share information where required by law, regulation, court order, tax/accounting requirements, law
            enforcement request, or to protect our legal rights.
          </p>
        </section>

        <section>
          <h2>6. Children and young people</h2>

          <p>
            FundRaisely is intended to be used by adult organisers, committees, clubs, schools, charities, PTAs and
            community groups.
          </p>

          <p>
            Some events or fundraising activities may involve children or young people. Organisers should avoid entering
            unnecessary personal data about children. Where children’s names, team names or participation details are
            used, organisers are responsible for ensuring they have an appropriate lawful basis and any required
            permissions.
          </p>

          <p>FundRaisely does not knowingly invite children to create organiser accounts.</p>
        </section>

        <section>
          <h2>7. Cookies</h2>

          <p>
            We use cookies and similar technologies to operate and improve our website and platform. For more information
            about the cookies we use and how you can manage your choices, please see our{' '}
            <Link to="/legal/cookies">Cookie Policy</Link>.
          </p>
        </section>

        <section>
          <h2>8. How long we keep personal data</h2>

          <p>We keep personal data only for as long as necessary for the purposes described in this policy.</p>

          <p>Account information is generally kept while your account is active.</p>

          <p>
            Event, ticketing, payment, reconciliation and reporting records may be kept for longer where needed for
            legal, accounting, audit, dispute, fraud prevention or reporting purposes. In many cases, this may be up to 6
            years.
          </p>

          <p>
            Support messages and enquiry records may be kept for as long as needed to manage the enquiry and maintain
            appropriate business records.
          </p>

          <p>When personal data is no longer needed, we will delete it or anonymise it where appropriate.</p>
        </section>

        <section>
          <h2>9. International transfers</h2>

          <p>
            We aim to store and process personal data in the UK, Ireland or the European Economic Area where possible.
          </p>

          <p>
            Some of our service providers may process personal data outside the UK, Ireland or EEA. Where this happens,
            we will use appropriate safeguards, such as Standard Contractual Clauses or other legally recognised transfer
            mechanisms.
          </p>
        </section>

        <section>
          <h2>10. Security</h2>

          <p>
            We take reasonable technical and organisational measures to protect personal data from unauthorised access,
            loss, misuse, alteration or disclosure.
          </p>

          <p>
            However, no online service can be guaranteed to be completely secure. Users should keep their login details
            safe and contact us if they believe their account or data has been compromised.
          </p>
        </section>

        <section>
          <h2>11. Your rights</h2>

          <p>Depending on your location and the circumstances, you may have the right to:</p>

          <ul>
            <li>request access to your personal data;</li>
            <li>ask us to correct inaccurate personal data;</li>
            <li>ask us to delete personal data;</li>
            <li>ask us to restrict processing;</li>
            <li>object to processing;</li>
            <li>request data portability;</li>
            <li>withdraw consent where we rely on consent;</li>
            <li>object to direct marketing;</li>
            <li>complain to a data protection supervisory authority.</li>
          </ul>

          <p>
            To exercise your rights, contact us at{' '}
            <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>.
          </p>

          <p>We may need to verify your identity before responding to a request.</p>
        </section>

        <section>
          <h2>12. Complaints</h2>

          <p>
            If you are unhappy with how we use your personal data, please contact us first so we can try to resolve the
            issue.
          </p>

          <p>You also have the right to complain to a data protection supervisory authority.</p>

          <p>
            If you are in Ireland, you can contact the <strong>Data Protection Commission</strong>.
          </p>

          <p>
            If you are in the UK, you can contact the <strong>Information Commissioner’s Office</strong>.
          </p>
        </section>

        <section>
          <h2>13. Marketing communications</h2>

          <p>We may send marketing emails where we have your consent or where permitted by law.</p>

          <p>
            You can unsubscribe from marketing communications at any time using the unsubscribe link in the email or by
            contacting us.
          </p>

          <p>
            We will still send service-related messages where necessary, such as account, security, payment, ticketing or
            event-related communications.
          </p>
        </section>

        <section>
          <h2>14. Changes to this policy</h2>

          <p>We may update this Privacy Policy from time to time.</p>

          <p>
            When we make significant changes, we may notify users by email, platform notice or by updating the policy on
            our website.
          </p>

          <p>The latest version will always be available on our website.</p>
        </section>
      </div>
    </main>
  );
}