// src/components/mgtsystem/components/digitalEvents/tabs/SubscriptionLinkPanel.tsx
//
// Fills the slot the Tickets tab occupies for other activity types — there's
// nothing to sell here, just a join link supporters use to sign up and start
// paying weekly via Stripe. Same copy-to-clipboard interaction/fallback as
// TicketEmbedCodePanel's CodeBlock (Clipboard API first, execCommand fallback).

import { useState } from 'react';
import { Check, Copy, ExternalLink, Info, Puzzle } from 'lucide-react';
import type { Challenge } from '../../../../puzzles/services/ChallengeService';

interface Props {
  challenge: Challenge | null;
  challengeLoading: boolean;
}

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

export default function SubscriptionLinkPanel({ challenge, challengeLoading }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (challengeLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
      </div>
    );
  }

  if (!challenge) {
    return <div className="p-5 text-sm text-[#52636f]">No linked challenge found.</div>;
  }

  const origin = window.location.origin;
  const joinUrl = `${origin}/join/puzzle/challenge/${challenge.id}`;
  const canJoin = challenge.status === 'active';

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setState('copied');
      window.setTimeout(() => setState('idle'), 1800);
      return;
    } catch { /* fall through */ }
    if (copyViaExecCommand(joinUrl)) {
      setState('copied');
      window.setTimeout(() => setState('idle'), 1800);
      return;
    }
    setState('failed');
  };

  return (
    <div className="space-y-5 p-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: '#7c3aed' }}>
            <Puzzle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#102532]">Supporter join link</h3>
            <p className="mt-1 text-xs text-gray-500">
              Share this so supporters can sign up and start their weekly puzzle subscription.
            </p>
          </div>
        </div>

        {!canJoin && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
            <p className="text-xs text-amber-900">
              {challenge.status === 'draft'
                ? 'This challenge is still a draft — activate it from the Launch tab before sharing this link.'
                : `This challenge is ${challenge.status} — new sign-ups aren't being accepted.`}
            </p>
          </div>
        )}

        <div className="relative mt-4">
          <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-[#0d1117] p-4 text-xs leading-6 text-[#c9d1d9]">
            <code>{joinUrl}</code>
          </div>
          <button type="button" onClick={onCopy}
            className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
              state === 'copied' ? 'bg-green-600 text-white' : 'bg-white text-[#7c3aed] hover:bg-gray-50'
            }`}>
            {state === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {state === 'copied' ? 'Copied' : 'Copy link'}
          </button>
          {state === 'failed' && (
            <p className="mt-2 text-xs text-red-600">
              Couldn't copy automatically — select the link above and copy it manually (Ctrl/Cmd+C).
            </p>
          )}
        </div>

        {canJoin && (
          <a href={joinUrl} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c3aed] hover:opacity-80">
            Preview the join page directly
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </section>
    </div>
  );
}