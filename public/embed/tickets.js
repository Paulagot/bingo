/**
 * public/embed/tickets.js
 *
 * Served at /embed/tickets.js - this is the script clubs paste on
 * their own websites alongside the <button data-fundraisely-tickets ...>
 * tag.
 *
 * Deliberately near-identical to donate.js - same modal, same
 * domain-check gate, same "postMessage is a courtesy notice, not a
 * confirmation" contract. Differences: keyed by roomId instead of
 * clubId, and the iframe content (TicketEmbedPage) does its own
 * Stripe-new-tab handoff, so this script does NOT need any special
 * handling for that - it only ever manages ONE iframe (the ticket
 * purchase flow itself); the Stripe/crypto tabs are opened and
 * tracked entirely inside that iframe, invisible to this script.
 *
 * TODO before shipping: confirm/build the domain-check endpoint below.
 * donate.js's equivalent is GET /api/donations/:clubId/domain-check.
 * This assumes a parallel GET /api/quiz/tickets/room/:roomId/domain-check
 * - verify this exists (it did not appear in any router file shown so
 * far) or add it alongside the club's existing per-room domain
 * allow-list before relying on this in production. Until it exists,
 * every button will show as "not authorized" (fails closed, same as
 * donate.js's own fallback behavior on network failure) - safe by
 * default, but won't actually work for anyone yet.
 */

(function () {
  'use strict';

  var scriptTag = document.currentScript;
  var baseUrl = scriptTag
    ? new URL(scriptTag.src).origin
    : 'https://fundraisely.ie'; // fallback if currentScript isn't available (old browsers)

  var MODAL_ID = 'fundraisely-ticket-modal';

  // Per-roomId cache of the domain-check result, so multiple buttons
  // for the same room on one page only trigger one network call.
  var domainCheckCache = {};

  // ── Domain check ─────────────────────────────────────────────────────

  function checkDomainAllowed(roomId) {
    if (domainCheckCache[roomId]) return domainCheckCache[roomId];

    var url =
      baseUrl +
      '/api/quiz/tickets/room/' +
      encodeURIComponent(roomId) +
      '/domain-check?hostname=' +
      encodeURIComponent(window.location.hostname);

    var promise = fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) { return !!(data && data.allowed); })
      .catch(function () {
        // Network failure (or endpoint not built yet): fail closed,
        // same as donate.js's own fallback behavior.
        return false;
      });

    domainCheckCache[roomId] = promise;
    return promise;
  }

  function showNotAuthorizedNotice(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.title = 'This ticket button is not authorized for this website.';
  }

  // ── Modal creation ───────────────────────────────────────────────────

  function createModal(roomId, title) {
    if (document.getElementById(MODAL_ID)) return; // already open

    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title || 'Buy a ticket');

    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
      'background:rgba(16,37,50,0.6)',
      'backdrop-filter:blur(3px)',
      '-webkit-backdrop-filter:blur(3px)',
    ].join(';');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    var container = document.createElement('div');
    container.style.cssText = [
      'position:relative',
      'width:100%',
      'max-width:460px',
      'max-height:90vh',
      'background:#ffffff',
      'border-radius:16px',
      'box-shadow:0 24px 64px rgba(0,0,0,0.2)',
      'overflow:hidden',
      'display:flex',
      'flex-direction:column',
    ].join(';');

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close ticket purchase');
    closeBtn.style.cssText = [
      'position:absolute',
      'top:10px',
      'right:10px',
      'z-index:1',
      'width:28px',
      'height:28px',
      'border:none',
      'border-radius:50%',
      'background:rgba(0,0,0,0.12)',
      'color:#ffffff',
      'font-size:16px',
      'line-height:1',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeModal);

    var iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/embed/tickets/' + encodeURIComponent(roomId);
    iframe.title = title || 'Buy a ticket';
    iframe.style.cssText = [
      'width:100%',
      'height:min(720px, 85vh)',
      'border:none',
      'display:block',
    ].join(';');
    // Allow payment APIs inside the iframe (Apple Pay / Google Pay via
    // Stripe's Payment Request button, if/when enabled).
    // Allow payment APIs (Apple Pay / Google Pay via Stripe's Payment
    // Request button) AND clipboard-write - without the latter,
    // navigator.clipboard.writeText() inside the iframe silently fails
    // for any cross-origin iframe (this is a Permissions Policy the
    // BROWSER enforces; only the embedding page granting it here can
    // delegate it inward). This is what powers the "copy reference"
    // step for Revolut/bank-transfer/manual payment methods.
    iframe.setAttribute('allow', 'payment; clipboard-write');
    iframe.setAttribute('loading', 'eager');

    container.appendChild(closeBtn);
    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    document.addEventListener('keydown', handleKeyDown);

    iframe.addEventListener('load', function () {
      try { iframe.contentWindow.focus(); } catch (e) {}
    });
  }

  function closeModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', handleKeyDown);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) closeModal();
  }

  // ── postMessage listener ─────────────────────────────────────────────
  // UI-courtesy fast path only. TicketEmbedPage's onComplete only fires
  // once TicketPurchaseFlow has ALREADY independently confirmed the
  // ticket (via backend polling for Stripe, on-chain verification for
  // crypto, or the existing manual-confirm path for instant payments).
  // This listener does not itself decide anything - it just lets the
  // modal close a little sooner when the message happens to arrive.
  //
  // IMPORTANT: on FUNDRAISELY_TICKET_SUCCESS, we deliberately do NOT
  // close the modal. The 'complete' step's confirmation UI (ticket
  // details, join token, etc.) is already rendered inside the iframe
  // at the exact moment this message fires - auto-closing here would
  // tear that down before the buyer ever sees it, for every payment
  // method (Stripe, crypto, instant_payment/Revolut alike), not just
  // some. Same behavior the inline (no-button, no-modal) embed already
  // has: nothing closes it automatically, the buyer reads their
  // confirmation and closes it themselves (X button, Esc, or clicking
  // outside - all still work below).

  window.addEventListener('message', function (event) {
    if (event.origin !== baseUrl) return;

    var data = event.data || {};
    if (data.type === 'FUNDRAISELY_TICKET_SUCCESS') {
      try {
        document.dispatchEvent(new CustomEvent('fundraisely:ticket-success', {
          detail: { roomId: data.roomId, ticketId: data.ticketId },
          bubbles: true,
        }));
      } catch (e) {}
    }
    if (data.type === 'FUNDRAISELY_TICKET_CLOSE') {
      closeModal();
    }
  });

  // ── Button wiring ────────────────────────────────────────────────────

  function wireButtons() {
    var buttons = document.querySelectorAll('[data-fundraisely-tickets]');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        if (btn._fundraiselyWired) return;
        btn._fundraiselyWired = true;

        var roomId = btn.getAttribute('data-room-id');
        var title = btn.getAttribute('data-title') || 'Buy a ticket';

        if (!roomId) {
          console.warn('[FundRaisely] data-room-id is missing on the ticket button');
          return;
        }

        checkDomainAllowed(roomId).then(function (allowed) {
          if (!allowed) {
            showNotAuthorizedNotice(btn);
            return;
          }
          btn.addEventListener('click', function () {
            createModal(roomId, title);
          });
        });
      })(buttons[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          if (nodes[j].nodeType === 1) wireButtons();
        }
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

})();