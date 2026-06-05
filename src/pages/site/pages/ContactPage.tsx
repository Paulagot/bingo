import { useState } from "react";
import { Send, CheckCircle, AlertCircle, CalendarDays, Users, MessageSquare } from "lucide-react";
import GenericMarketingPage from "./GenericMarketingPage";
import "./../ContactPage.css";

type ContactStatus = "idle" | "sending" | "ok" | "error";

export default function ContactPage() {
  return (
    <>
      <GenericMarketingPage
        path="/contact"
        seoTitle="Contact FundRaisely"
        seoDescription="Contact FundRaisely about quiz fundraisers, fundraising games, platform demos and support for clubs, charities and community groups."
        eyebrow="Contact FundRaisely"
        h1="Talk to us about your next fundraiser"
        intro="Arrange a demo, ask about running a FundRaisely event, or get help choosing the right activity for your club, charity, school or community group."
        imageKey="volunteersTickets"
      />

      <ContactContent />
    </>
  );
}

function ContactContent() {
  return (
    <main className="contact-page">
      <section className="contact-intro-section">
        <div className="contact-intro-grid">
          <div className="contact-intro-copy">
            <p className="section-eyebrow">How we can help</p>
            <h2>Book a demo, ask a question or join a live session</h2>
            <p>
              Whether you are planning a quiz night, elimination game, puzzle challenge, sponsored
              event, dinner, sports event or another fundraiser, we can help you understand how
              FundRaisely fits into your setup.
            </p>
            <p>
              Use the form below to ask about demos, early access, fundraising activities, payments,
              event setup, reporting or support for your organisation.
            </p>
          </div>

          <div className="contact-info-cards">
            <article className="contact-info-card">
              <span className="contact-info-icon">
                <MessageSquare aria-hidden="true" />
              </span>
              <h3>Arrange a demo</h3>
              <p>
                Tell us what type of fundraiser you want to run and we can show you the most relevant
                parts of the platform.
              </p>
            </article>

            <article className="contact-info-card">
              <span className="contact-info-icon">
                <Users aria-hidden="true" />
              </span>
              <h3>Ask about activities</h3>
              <p>
                We can talk through quizzes, elimination games, puzzle challenges, sponsored
                fundraisers, ticketed events and future formats.
              </p>
            </article>

            <article className="contact-info-card">
              <span className="contact-info-icon">
                <CalendarDays aria-hidden="true" />
              </span>
              <h3>Join live sessions</h3>
              <p>
                We run regular live sessions covering fundraising ideas, event setup and FundRaisely
                training. Create a free account to access upcoming sessions.
              </p>
              <a href="/free-trial" className="contact-card-link">
                Sign up for free access
              </a>
            </article>
          </div>
        </div>
      </section>

      <ContactForm />
    </main>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<ContactStatus>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken: "TODO" }),
      });

      if (!res.ok) throw new Error();

      setStatus("ok");
      setForm({ name: "", email: "", message: "" });
      setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }

  return (
    <section className="contact-form-section" aria-labelledby="contact-form-title">
      <div className="contact-form-shell">
        <div className="contact-form-card">
          <div className="contact-form-gradient" />

          <div className="contact-form-content">
            <div className="contact-form-header">
              <p className="section-eyebrow">Send us a message</p>
              <h2 id="contact-form-title">Get in touch</h2>
              <p>
                Tell us a little about your organisation, the fundraiser you have in mind, or the
                support you need. We’ll get back to you as soon as possible.
              </p>

              <div className="contact-social-panel">
                <p>Connect with us on social</p>

                <div className="contact-social-links">
                  <a
                    href="https://www.linkedin.com/company/fundraisely"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social-link contact-social-link--linkedin"
                    aria-label="LinkedIn"
                  >
                    <svg className="contact-social-icon" fill="white" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>

                  <a
                    href="https://x.com/Fundraisely"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social-link contact-social-link--x"
                    aria-label="X (Twitter)"
                  >
                    <svg viewBox="0 0 24 24" className="contact-social-icon" fill="white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>

                  <a
                    href="https://www.instagram.com/fund.raisely/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social-link contact-social-link--instagram"
                    aria-label="Instagram"
                  >
                    <svg className="contact-social-icon" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>

                  <a
                    href="https://www.facebook.com/profile.php?id=61580826725459"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social-link contact-social-link--facebook"
                    aria-label="Facebook"
                  >
                    <svg className="contact-social-icon" fill="white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="contact-form">
              <div className="contact-field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Smith"
                  value={form.name}
                  onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                  disabled={status === "sending"}
                />
              </div>

              <div className="contact-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                  disabled={status === "sending"}
                />
              </div>

              <div className="contact-field">
                <label htmlFor="message">How can we help?</label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  placeholder="Tell us about your fundraiser, your organisation, or the demo you would like to arrange..."
                  value={form.message}
                  onChange={(e) => setForm((v) => ({ ...v, message: e.target.value }))}
                  disabled={status === "sending"}
                />
              </div>

              <div className="contact-submit-row">
                <button type="submit" disabled={status === "sending"} className="contact-submit-button">
                  {status === "sending" ? (
                    <>
                      <span className="contact-spinner" aria-hidden="true" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send message</span>
                      <Send aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              {status === "ok" && (
                <div className="contact-status contact-status--success" role="status">
                  <span className="contact-status-icon">
                    <CheckCircle aria-hidden="true" />
                  </span>
                  <div>
                    <h4>Message sent successfully</h4>
                    <p>
                      Thank you for reaching out. We’ll get back to you as soon as possible —
                      usually within 24 hours.
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="contact-status contact-status--error" role="alert">
                  <span className="contact-status-icon">
                    <AlertCircle aria-hidden="true" />
                  </span>
                  <div>
                    <h4>Something went wrong</h4>
                    <p>
                      We couldn't send your message. Please try again or email us directly at{" "}
                      <a href="mailto:hello@fundraisely.ie">hello@fundraisely.ie</a>.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}