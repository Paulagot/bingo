import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,

  MessageCircle,
  Send,
} from "lucide-react";
import "../ContactPage.css";

type ContactStatus = "idle" | "sending" | "ok" | "error";

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/fundraisely",
    shortLabel: "in",
  },
  {
    label: "X",
    href: "https://x.com/Fundraisely",
    shortLabel: "𝕏",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/fund.raisely/",
    shortLabel: "IG",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61580826725459",
    shortLabel: "f",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organisation: "",
    message: "",
  });

  const [status, setStatus] = useState<ContactStatus>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          captchaToken: "TODO",
          source: "fundraisely-contact-page",
        }),
      });

      if (!res.ok) {
        throw new Error("Contact form failed");
      }

      setStatus("ok");
      setForm({
        name: "",
        email: "",
        organisation: "",
        message: "",
      });

      window.setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 5000);
    }
  }

  return (
    <>
      <title>Contact FundRaisely</title>
      <meta
        name="description"
        content="Contact FundRaisely about quiz fundraisers, fundraising games, event setup, ticketing, demos and support."
      />

      <main>
        <section className="hero hero--compact contact-hero">
          <div className="site-shell hero__inner contact-hero__inner">
            <div className="hero__content">
              <div className="hero__meta-row">
                <p className="hero__eyebrow">Contact</p>
                <span className="status-pill">Fundraising platform support</span>
              </div>

              <h1 className="hero__title">Talk to us about your fundraiser</h1>

              <p className="hero__description">
                Have a question about running a fundraiser, setting up an event,
                collecting payments, inviting admins, sharing reports and impact statements or using FundRaisely for
                your club, charity, school or community group? Send us a message
                and we’ll point you in the right direction.
              </p>

            
            </div>

            <aside className="contact-hero-card" aria-label="Contact details">
              <div className="contact-hero-card__icon">
                <MessageCircle aria-hidden="true" />
              </div>

              <h2>What can we help with?</h2>

              <p>
                Platform demos, fundraising event setup, quiz nights, ticketing,
                payment options, sponsor/prize tracking, reporting and launch
                questions.
              </p>

         
            </aside>
          </div>
        </section>

        <section className="section contact-main-section" id="contact-form">
          <div className="site-shell contact-layout">
            <div className="contact-copy">
              <p className="eyebrow">Get in touch</p>

              <h2>Tell us what you’re planning</h2>

              <p>
                You do not need to have everything figured out. Tell us the type
                of fundraiser you want to run, who it is for, and what support
                you need.
              </p>

              <div className="contact-info-list">
                <article className="contact-info-card">
                  <h3>For clubs and charities</h3>
                  <p>
                    Ask about quiz nights, sponsored events, ticketed events,
                    admins, payments and event reports.
                  </p>
                </article>

                <article className="contact-info-card">
                  <h3>For demos</h3>
                  <p>
                    Tell us a little about your organisation and we can help you
                    see whether FundRaisely is a good fit.
                  </p>
                </article>

                <article className="contact-info-card">
                  <h3>For support</h3>
                  <p>
                    Already testing the platform? Send us the issue, event name
                    and what you were trying to do.
                  </p>
                </article>
              </div>

              <div className="contact-social-panel">
                <p>Connect with us</p>

                <div className="contact-social-links">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon contact-social-icon"
                      aria-label={social.label}
                    >
                      {social.shortLabel}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <form className="contact-form-card" onSubmit={onSubmit}>
              <div className="contact-field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  value={form.name}
                  disabled={status === "sending"}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="contact-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  disabled={status === "sending"}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="contact-field">
                <label htmlFor="organisation">Organisation</label>
                <input
                  id="organisation"
                  type="text"
                  autoComplete="organization"
                  placeholder="Club, charity, school or group name"
                  value={form.organisation}
                  disabled={status === "sending"}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      organisation: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="contact-field">
                <label htmlFor="message">How can we help?</label>
                <textarea
                  id="message"
                  required
                  rows={7}
                  placeholder="Tell us about your fundraiser, event idea, demo request or support question..."
                  value={form.message}
                  disabled={status === "sending"}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      message: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Add Cloudflare Turnstile here later and replace captchaToken: "TODO" */}

              <div className="contact-submit-row">
                <button
                  type="submit"
                  className="button button--primary-dark contact-submit-button"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    <>
                      <span className="contact-spinner" aria-hidden="true" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send message
                      <Send aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              {status === "ok" && (
                <div className="contact-status contact-status--success" role="status">
                  <CheckCircle aria-hidden="true" />
                  <div>
                    <h3>Message sent</h3>
                    <p>
                      Thanks for getting in touch. We’ll get back to you as soon
                      as possible.
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="contact-status contact-status--error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <div>
                    <h3>Something went wrong</h3>
                    <p>
                      Please try again                
                    
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </section>
      </main>
    </>
  );
}