// public/embed/donate.js
//
// FundRaisely donation button embed script.
// Clubs paste a button + this script into their website.
// The script opens the existing /embed/donate/:clubId page inside a modal iframe.

(function () {
  if (window.FundRaiselyDonate) return;

  var scriptEl = document.currentScript;
  var baseUrl = 'https://fundraisely.ie';

  try {
    if (scriptEl && scriptEl.src) {
      baseUrl = new URL(scriptEl.src).origin;
    }
  } catch (err) {
    // Fallback to production URL.
  }

  var OVERLAY_ID = 'fundraisely-donate-overlay';
  var ESC_HANDLER_KEY = '__fundraiselyDonateEscapeHandler';

  function createStyles() {
    if (document.getElementById('fundraisely-donate-styles')) return;

    var style = document.createElement('style');
    style.id = 'fundraisely-donate-styles';
    style.textContent =
      '#fundraisely-donate-overlay{' +
      'position:fixed;' +
      'inset:0;' +
      'z-index:2147483647;' +
      'background:rgba(16,37,50,.58);' +
      'display:flex;' +
      'align-items:center;' +
      'justify-content:center;' +
      'padding:18px;' +
      'box-sizing:border-box;' +
      '}' +
      '#fundraisely-donate-modal{' +
      'position:relative;' +
      'width:100%;' +
      'max-width:430px;' +
      'max-height:92vh;' +
      'background:#fff;' +
      'border-radius:18px;' +
      'box-shadow:0 26px 80px rgba(0,0,0,.28);' +
      'overflow:hidden;' +
      'box-sizing:border-box;' +
      '}' +
      '#fundraisely-donate-close{' +
      'position:absolute;' +
      'top:10px;' +
      'right:10px;' +
      'z-index:2;' +
      'width:34px;' +
      'height:34px;' +
      'border:0;' +
      'border-radius:999px;' +
      'background:#f6f1e8;' +
      'color:#102532;' +
      'font-size:24px;' +
      'line-height:1;' +
      'cursor:pointer;' +
      'display:flex;' +
      'align-items:center;' +
      'justify-content:center;' +
      '}' +
      '#fundraisely-donate-close:hover{' +
      'background:#ece3d4;' +
      '}' +
      '#fundraisely-donate-frame{' +
      'width:100%;' +
      'height:570px;' +
      'max-height:92vh;' +
      'border:0;' +
      'display:block;' +
      'background:#fff;' +
      '}' +
      '@media(max-width:480px){' +
      '#fundraisely-donate-overlay{' +
      'padding:10px;' +
      'align-items:flex-end;' +
      '}' +
      '#fundraisely-donate-modal{' +
      'max-width:100%;' +
      'border-radius:18px 18px 0 0;' +
      '}' +
      '#fundraisely-donate-frame{' +
      'height:82vh;' +
      '}' +
      '}';

    document.head.appendChild(style);
  }

  function close() {
    var existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    if (window[ESC_HANDLER_KEY]) {
      document.removeEventListener('keydown', window[ESC_HANDLER_KEY]);
      window[ESC_HANDLER_KEY] = null;
    }

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function open(clubId, options) {
    if (!clubId) return;

    options = options || {};

    close();
    createStyles();

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', options.title || 'Donate');

    var modal = document.createElement('div');
    modal.id = 'fundraisely-donate-modal';

    var closeButton = document.createElement('button');
    closeButton.id = 'fundraisely-donate-close';
    closeButton.type = 'button';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close donation form');
    closeButton.addEventListener('click', close);

    var iframe = document.createElement('iframe');
    iframe.id = 'fundraisely-donate-frame';
    iframe.title = options.title || 'Donate';
    iframe.loading = 'lazy';
    iframe.allow = 'payment';
    iframe.src = baseUrl + '/embed/donate/' + encodeURIComponent(clubId);

    modal.appendChild(closeButton);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });

    window[ESC_HANDLER_KEY] = function (event) {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', window[ESC_HANDLER_KEY]);

    setTimeout(function () {
      closeButton.focus();
    }, 0);
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var button = target.closest('[data-fundraisely-donate]');
    if (!button) return;

    event.preventDefault();

    var clubId = button.getAttribute('data-club-id');
    var title = button.getAttribute('data-title') || 'Donate';

    open(clubId, { title: title });
  });

  window.FundRaiselyDonate = {
    open: open,
    close: close,
  };
})();