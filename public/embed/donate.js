/**
 * public/embed/donate.js
 *
 * Served at /embed/donate.js — this is the script clubs paste on their
 * own websites alongside the <button data-fundraisely-donate ...> tag.
 *
 * What it does:
 *   1. Finds any <button data-fundraisely-donate> on the page
 *   2. On click, injects a full-screen modal overlay into the club's page
 *   3. Loads the FundRaisely donation form inside an <iframe> in that modal
 *   4. Closes the modal on overlay-click, Esc key, or postMessage from iframe
 *
 * Deliberately plain JS (no build step, no dependencies) since this file
 * is served statically and loaded by arbitrary third-party websites.
 *
 * Cross-origin note: the iframe src points back to FundRaisely's own
 * domain (same domain that served THIS script), so the iframe content is
 * FundRaisely's own code. The club's page is the third-party context;
 * this script runs in that context and creates the overlay.
 */

(function () {
  'use strict';

  // The base URL for the iframe src is the same origin that served this
  // script — that way it works correctly on both fundraisely.ie and
  // fundraisely.co.uk without hardcoding either domain.
  var scriptTag = document.currentScript;
  var baseUrl = scriptTag
    ? new URL(scriptTag.src).origin
    : 'https://fundraisely.ie'; // fallback if currentScript isn't available (old browsers)

  var MODAL_ID = 'fundraisely-donation-modal';

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
  // origin before acting on any message.

  window.addEventListener('message', function (event) {
    // Only accept messages from FundRaisely's own origin
    if (event.origin !== baseUrl) return;

    var data = event.data || {};
    if (data.type === 'FUNDRAISELY_DONATION_SUCCESS') {
      closeModal();
      // Optionally dispatch a custom event the club's page can listen to
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
        btn.addEventListener('click', function () {
          var clubId = btn.getAttribute('data-club-id');
          var title = btn.getAttribute('data-title') || 'Make a donation';
          if (!clubId) {
            console.warn('[FundRaisely] data-club-id is missing on the donate button');
            return;
          }
          createModal(clubId, title);
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