// src/pages/site/legal/CookiesPage.tsx

import { Link } from 'react-router-dom';

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <div className="site-shell legal-page__shell">
        <p className="eyebrow">Legal</p>

        <h1>Cookie Policy</h1>
        <p className="legal-page__updated">Last updated: [insert date]</p>

        <p>
          This Cookie Policy explains how <strong>FundRaisely</strong>, operated by{' '}
          <strong>The Professional Training Academy Limited T/A FundRaisely</strong>, uses cookies and similar
          technologies on our website, platform, event pages, ticketing pages, fundraising tools and live game services.
        </p>

        <p>
          This policy should be read together with our <Link to="/legal/privacy">Privacy Policy</Link>.
        </p>

        <section>
          <h2>1. What are cookies?</h2>

          <p>
            Cookies are small text files placed on your device when you visit a website or use an online service. They
            help websites and platforms work properly, remember information, keep users signed in, improve security, and
            understand how services are used.
          </p>

          <p>
            Similar technologies may include local storage, session storage, pixels, tags, device identifiers, software
            development kits, and connection/session identifiers used by web applications.
          </p>
        </section>

        <section>
          <h2>2. How FundRaisely uses cookies and similar technologies</h2>

          <p>We use cookies and similar technologies to:</p>

          <ul>
            <li>keep our website and platform secure;</li>
            <li>allow users to sign in and manage their account;</li>
            <li>remember account, event, ticketing, payment and game session information;</li>
            <li>support live fundraising games and real-time event features;</li>
            <li>support ticket purchasing and check-in flows;</li>
            <li>prevent fraud, misuse and unauthorised access;</li>
            <li>understand how people use our website and services, where analytics are enabled;</li>
            <li>support marketing or advertising activity, where this is enabled and consent has been given.</li>
          </ul>
        </section>

        <section>
          <h2>3. Types of cookies and technologies we use</h2>

          <h3>Strictly necessary cookies and storage</h3>

          <p>
            These are required for FundRaisely to work. They support core functions such as login, account security,
            payment flow continuity, ticket purchases, event access, game-room access, live game state, socket
            connections, fraud prevention and basic platform operation.
          </p>

          <p>
            These technologies may include cookies, local storage, session storage and temporary connection identifiers.
            Because they are necessary to provide the service you request, they do not require consent, but we still
            explain them in this policy.
          </p>

          <h3>Live game and socket connection technologies</h3>

          <p>
            FundRaisely uses real-time connection technology, including Socket.IO or similar tools, to run live games and
            event features.
          </p>

          <p>These technologies may be used to:</p>

          <ul>
            <li>connect a player, host, admin or screen display to the correct room;</li>
            <li>keep a user connected during a live game or event;</li>
            <li>send and receive live game updates;</li>
            <li>manage timers, questions, answers, scores, leaderboards and game phases;</li>
            <li>support live ticket check-in or event control features;</li>
            <li>detect disconnections and reconnect users where possible.</li>
          </ul>

          <p>
            These technologies are treated as strictly necessary where they are required to deliver a live game, event or
            ticketing service requested by the user.
          </p>

          <h3>Functional cookies</h3>

          <p>
            Functional cookies or storage may remember choices you make, such as display preferences, form progress,
            selected payment method, previously selected event options, or other convenience settings.
          </p>

          <p>
            Where these are not strictly necessary, we will only use them where permitted by law or where you have given
            consent.
          </p>

          <h3>Analytics cookies</h3>

          <p>
            Analytics cookies help us understand how visitors use our website and services. For example, they may tell us
            which pages are visited, how users move through the site, which features are used, and where errors occur.
          </p>

          <p>
            Analytics cookies are not strictly necessary to provide the service. Where we use analytics cookies that
            require consent, we will ask for your consent before setting them.
          </p>

          <h3>Marketing cookies</h3>

          <p>
            Marketing cookies, pixels or similar technologies may be used to measure campaigns, understand advertising
            performance, or show relevant FundRaisely content on other platforms.
          </p>

          <p>
            We will only use marketing cookies or similar tracking technologies where they are enabled and where you have
            given consent.
          </p>
        </section>

        <section>
          <h2>4. Examples of cookies and storage we may use</h2>

          <p>
            The exact cookies and storage items used may change as we develop the platform. The examples below describe
            the types of technologies we may use.
          </p>

          <div className="legal-page__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Purpose</th>
                  <th>Examples</th>
                  <th>Consent required?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Strictly necessary</td>
                  <td>Login, authentication, account security and platform access</td>
                  <td>Session cookies, auth tokens, CSRF/security tokens</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>Strictly necessary</td>
                  <td>Live game and event-room connection</td>
                  <td>Socket session identifiers, room connection state, reconnection data</td>
                  <td>No, where needed to provide the live service</td>
                </tr>
                <tr>
                  <td>Strictly necessary</td>
                  <td>Ticket purchase, checkout, order confirmation and check-in</td>
                  <td>Temporary ticket/order session data, payment flow state, QR/check-in session data</td>
                  <td>No, where needed to complete the service</td>
                </tr>
                <tr>
                  <td>Strictly necessary</td>
                  <td>Fraud prevention, security and abuse prevention</td>
                  <td>Security logs, rate-limiting identifiers, anti-abuse tokens</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>Functional</td>
                  <td>Remembering user choices or form progress</td>
                  <td>Saved preferences, selected options, draft setup progress</td>
                  <td>Sometimes, depending on whether they are essential</td>
                </tr>
                <tr>
                  <td>Analytics</td>
                  <td>Understanding how visitors use the website and platform</td>
                  <td>Page views, feature usage, visitor statistics, error analytics</td>
                  <td>Yes, where required by law</td>
                </tr>
                <tr>
                  <td>Marketing</td>
                  <td>Measuring campaigns or showing relevant advertising</td>
                  <td>Marketing pixels, advertising tags, campaign tracking cookies</td>
                  <td>Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>5. Local storage and session storage</h2>

          <p>
            FundRaisely may use browser local storage or session storage as well as cookies. These technologies store
            small amounts of information in your browser and can help the platform work smoothly.
          </p>

          <p>For example, local storage or session storage may be used to remember:</p>

          <ul>
            <li>that you are connected to a particular event or game room;</li>
            <li>temporary player, host, admin or ticket session details;</li>
            <li>form progress during event or campaign setup;</li>
            <li>selected payment or ticket options;</li>
            <li>live game state needed to reconnect after a refresh or temporary disconnection;</li>
            <li>basic account or preference information.</li>
          </ul>

          <p>
            Where this storage is necessary to provide a service you requested, it is treated as strictly necessary.
            Where it is used for non-essential purposes, we will only use it where permitted by law or where you have
            given consent.
          </p>
        </section>

        <section>
          <h2>6. Third-party cookies and services</h2>

          <p>
            Some cookies or similar technologies may be set by third-party providers that help us operate FundRaisely.
          </p>

          <p>These may include providers for:</p>

          <ul>
            <li>payment processing;</li>
            <li>hosting and infrastructure;</li>
            <li>security and fraud prevention;</li>
            <li>email delivery;</li>
            <li>analytics;</li>
            <li>customer support;</li>
            <li>marketing or advertising, where enabled.</li>
          </ul>

          <p>
            Third-party providers may process information in accordance with their own privacy and cookie policies. Where
            we use third-party cookies that are not strictly necessary, we will seek consent where required.
          </p>
        </section>

        <section>
          <h2>7. Managing your cookie choices</h2>

          <p>
            Where we use non-essential cookies, you may be asked to accept, reject or manage your choices through a
            cookie banner or preference tool.
          </p>

          <p>
            You can also manage cookies through your browser settings. Most browsers allow you to block or delete
            cookies. If you block strictly necessary cookies or storage, some parts of FundRaisely may not work properly,
            including login, ticketing, payment flows, live games, event check-in or account features.
          </p>

          <p>
            If we introduce or change non-essential analytics, marketing or tracking cookies, we may update our cookie
            banner and this policy.
          </p>
        </section>

        <section>
          <h2>8. Changes to this Cookie Policy</h2>

          <p>We may update this Cookie Policy from time to time as our website, platform or cookie use changes.</p>

          <p>The latest version will always be available on our website.</p>
        </section>

        <section>
          <h2>9. Contact us</h2>

          <p>
            If you have questions about this Cookie Policy, contact us at{' '}
            <a href="mailto:support@fundraisely.co.uk">support@fundraisely.co.uk</a>.
          </p>
        </section>
      </div>
    </main>
  );
}