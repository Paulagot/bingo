// src/components/mgtsystem/components/digitalEvents/tabs/TicketEmbedCodePanel.tsx
//
// Sits directly below the "Public ticket purchase link" section on the
// Tickets tab. Unlike the donation button's embed section (a modal
// with a "Generate embed code" button that calls the BACKEND, because
// a Tier A manual-link button needs its saved payment link fetched
// first), this is a plain client-side expand/collapse — both snippets
// only ever need roomId + window.location.origin, both already known
// without a network call. Clicking "Get embed code" just reveals them;
// there's nothing to "generate" server-side.
//
// clubId is used ONLY to point the club at where they register their
// site's domain (the same allowed-domains list the donation button
// uses — see DonationButtonService.js's fundraisely_club_allowed_domains
// table). It does NOT appear in the embed snippets themselves — those
// only need roomId, since the backend resolves clubId from the room.

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  ExternalLink,
  Info,
  MonitorSmartphone,
  MousePointerClick,
} from 'lucide-react';

interface Props {
  roomId: string;
  clubId: string;
}

/**
 * Same two-step copy strategy as PaymentInstructions.tsx's CopyButton:
 * modern Clipboard API first, legacy execCommand('copy') fallback if
 * that fails, visible failure state only if both fail. Duplicated
 * here rather than imported, matching this codebase's existing
 * convention of small shared-shape helpers living independently per
 * module.
 */
function copyViaExecCommand(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}

function CodeBlock({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
      window.setTimeout(() => setState('idle'), 1800);
      return;
    } catch {
      // fall through to legacy fallback
    }
    if (copyViaExecCommand(code)) {
      setState('copied');
      window.setTimeout(() => setState('idle'), 1800);
      return;
    }
    setState('failed');
  };

  return (
    <div className="relative">
      <pre className="max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-[#0d1117] p-4 text-xs leading-6 text-[#c9d1d9]">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
          state === 'copied'
            ? 'bg-green-600 text-white'
            : 'bg-white text-[#157f85] hover:bg-gray-50'
        }`}
      >
        {state === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
        {state === 'copied' ? 'Copied' : 'Copy code'}
      </button>
      {state === 'failed' && (
        <p className="mt-2 text-xs text-red-600">
          Couldn't copy automatically — select the code above and copy it manually (Ctrl/Cmd+C).
        </p>
      )}
    </div>
  );
}

export default function TicketEmbedCodePanel({ roomId, clubId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const origin = window.location.origin;

  const buttonSnippet = [
    `<script src="${origin}/embed/tickets.js"></script>`,
    `<button data-fundraisely-tickets data-room-id="${roomId}" data-title="Buy Tickets">`,
    `  Buy Tickets`,
    `</button>`,
  ].join('\n');

  const inlineSnippet = [
    `<iframe`,
    `  src="${origin}/embed/tickets/${roomId}"`,
    `  title="Buy tickets"`,
    `  allow="payment; clipboard-write"`,
    `  style="width:100%;max-width:460px;height:720px;border:1px solid #ddd;border-radius:12px;display:block;"`,
    `></iframe>`,
  ].join('\n');

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#157f85] text-white shadow-sm">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#102532]">Embed on your own website</h3>
            <p className="mt-1 text-xs text-gray-500">
              Sell tickets directly on your site instead of sending people to the link above.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#157f85] shadow-sm transition hover:bg-gray-50"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Hide embed code' : 'Get embed code'}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-6 border-t border-gray-100 pt-5">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
            <p className="text-xs text-amber-900">
              Before the button version works on your site, your website's domain needs to be registered — the same setting used for your donation button (Payments → Donation Button → Authorized websites). Club ID: <code className="rounded bg-white px-1 py-0.5">{clubId}</code>
            </p>
          </div>

          {/* ── Button + modal ── */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-[#157f85]" />
              <h4 className="text-sm font-bold text-[#102532]">Button that opens a popup</h4>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              A small button. Clicking it pops up the ticket purchase flow in a modal. Uses the domain check above.
            </p>
            <CodeBlock code={buttonSnippet} />
          </div>

          {/* ── Inline iframe ── */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-[#157f85]" />
              <h4 className="text-sm font-bold text-[#102532]">Always-visible embed (no button)</h4>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              The ticket purchase form sits directly on your page, no click required.{' '}
              <strong>Note:</strong> this form does not currently check which site it's embedded on — anyone with this code could embed it. Fine for your own site, just don't share this exact snippet publicly.
            </p>
            <CodeBlock code={inlineSnippet} />
          </div>

          <a
            href={`${origin}/tickets/buy/${roomId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#157f85] hover:text-[#0e6268]"
          >
            Preview the ticket page directly
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </section>
  );
}