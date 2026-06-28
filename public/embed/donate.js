/**
 * public/embed/donate.js
 *
 * Served at /embed/donate.js — this is the script clubs paste on their
 * own websites alongside the <button data-fundraisely-donate ...> tag.
 *
 * What it does:
 *   1. Finds any <button data-fundraisely-donate> on the page
 *   2. Checks with the backend that this page's hostname is registered
 *      for the button's club id — if not, the button is left disabled
 *      with a clear inline notice instead of silently working anywhere
 *   3. On click, injects a full-screen modal overlay into the club's page
 *   4. Loads the FundRaisely donation form inside an <iframe> in that modal
 *   5. Closes the modal on overlay-click, Esc key, or postMessage from iframe
 *
 * Deliberately plain JS (no build step, no dependencies) since this file
 * is served statically and loaded by arbitrary third-party websites.
 *
 * Cross-origin note: the iframe src points back to FundRaisely's own
 * domain (same domain that served THIS script), so the iframe content is
 * FundRaisely's own code. The club's page is the third-party context;
 * this script runs in that context and creates the overlay.
 *
 * Domain check: each club registers the hostname(s) their button is
 * allowed to render on (see ManageDonationButtonModal.tsx's domain
 * field). This is checked client-side here AND re-checked server-side
 * on the actual checkout call — this client-side check is about not
 * rendering a working button on an unauthorized page at all, not the
 * only line of defense.
 */

(function () {
  'use strict';

  var scriptTag = document.currentScript;
  var baseUrl = scriptTag
    ? new URL(scriptTag.src).origin
    : 'https://fundraisely.ie'; // fallback if currentScript isn't available (old browsers)

  var MODAL_ID = 'fundraisely-donation-modal';

  // Per-clubId cache of the domain-check result, so multiple buttons
  // for the same club on one page only trigger one network call.
  var domainCheckCache = {};

  // ── Domain check ─────────────────────────────────────────────────────

  function checkDomainAllowed(clubId) {
    if (domainCheckCache[clubId]) return domainCheckCache[clubId];

    var url =
      baseUrl +
      '/api/donations/' +
      encodeURIComponent(clubId) +
      '/domain-check?hostname=' +
      encodeURIComponent(window.location.hostname);

    var promise = fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) { return !!(data && data.allowed); })
      .catch(function () {
        // Network failure: fail closed, same as the backend's own
        // fail-closed behavior on unexpected errors.
        return false;
      });

    domainCheckCache[clubId] = promise;
    return promise;
  }

  function showNotAuthorizedNotice(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.title = 'This donation button is not authorized for this website.';
  }

  // ── Modal creation ───────────────────────────────────────────────────

  function createModal(clubId, title) {
    if (document.getElementById(MODAL_ID)) return; // already open

    var overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title || 'Make a donation');

    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647', // max z-index, above everything on the club's page
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
      'background:rgba(16,37,50,0.6)',
      'backdrop-filter:blur(3px)',
      '-webkit-backdrop-filter:blur(3px)',
    ].join(';');

    // Close on overlay click (but not on the iframe itself)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    var container = document.createElement('div');
    container.style.cssText = [
      'position:relative',
      'width:100%',
      'max-width:400px',
      'background:#ffffff',
      'border-radius:16px',
      'box-shadow:0 24px 64px rgba(0,0,0,0.2)',
      'overflow:hidden',
    ].join(';');

    // Close button — lives on the container, above the iframe
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close donation form');
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
    iframe.src = baseUrl + '/embed/donate/' + encodeURIComponent(clubId);
    iframe.title = title || 'Make a donation';
    iframe.style.cssText = [
      'width:100%',
      'height:540px',
      'border:none',
      'display:block',
    ].join(';');
    // Allow payment APIs inside the iframe (needed for some payment flows)
    iframe.setAttribute('allow', 'payment');
    iframe.setAttribute('loading', 'eager');

    container.appendChild(closeBtn);
    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Trap focus inside modal and handle Esc
    document.addEventListener('keydown', handleKeyDown);

    // Focus the iframe once loaded so keyboard nav works
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
  // The iframe can send messages to close the modal (e.g. after a
  // successful checkout redirect back to /success). The iframe and this
  // script are on different origins (fundraisely.ie vs club's site), so
  // postMessage is the only way they can communicate — and we check the
  // origin before acting on any message. This is a UI-courtesy fast path
  // only; the embed page's own polling against the server ledger is the
  // real source of truth for whether a donation succeeded.

  window.addEventListener('message', function (event) {
    if (event.origin !== baseUrl) return;

    var data = event.data || {};
    if (data.type === 'FUNDRAISELY_DONATION_SUCCESS') {
      closeModal();
      try {
        document.dispatchEvent(new CustomEvent('fundraisely:donation-success', {
          detail: { clubId: data.clubId },
          bubbles: true,
        }));
      } catch (e) {}
    }
    if (data.type === 'FUNDRAISELY_DONATION_CLOSE') {
      closeModal();
    }
  });

  // ── Button wiring ────────────────────────────────────────────────────

  function wireButtons() {
    var buttons = document.querySelectorAll('[data-fundraisely-donate]');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        if (btn._fundraiselyWired) return; // don't double-wire
        btn._fundraiselyWired = true;

        var clubId = btn.getAttribute('data-club-id');
        var title = btn.getAttribute('data-title') || 'Make a donation';

        if (!clubId) {
          console.warn('[FundRaisely] data-club-id is missing on the donate button');
          return;
        }

        // Check domain authorization before wiring the click handler.
        // The button stays present but inert (and visibly disabled)
        // until/unless this resolves true.
        checkDomainAllowed(clubId).then(function (allowed) {
          if (!allowed) {
            showNotAuthorizedNotice(btn);
            return;
          }
          btn.addEventListener('click', function () {
            createModal(clubId, title);
          });
        });
      })(buttons[i]);
    }
  }

  // Wire buttons that exist at script load time, and observe for any
  // added dynamically afterward (e.g. in SPA-built club sites)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  // MutationObserver for dynamically added buttons
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