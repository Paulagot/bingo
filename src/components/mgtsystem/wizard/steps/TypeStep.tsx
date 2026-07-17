// src/components/mgtsystem/wizard/steps/TypeStep.tsx
//
// Step 1: "What are you running?" — one card per registry entry.
// Selecting a card is the ONLY thing this step does; everything the card
// implies (event.type, primary_action_type, which step-2 fields show,
// which step-3 renders) is declared in activityRegistry.tsx.
//
// Cards with available:false render disabled with a "coming soon" pill —
// during rollout those types keep using the existing Create Event + Add
// Activity flow (see INTEGRATION.md).

import { ACTIVITY_TYPES, type ActivityTypeId } from '../activityRegistry';

interface Props {
  selected:  ActivityTypeId | null;
  onSelect:  (type: ActivityTypeId) => void;
  disabled?: boolean;
}

export default function TypeStep({ selected, onSelect, disabled }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: '#102532' }}>
        What are you running?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIVITY_TYPES.map(def => {
          const Icon     = def.icon;
          const isActive = selected === def.id;
          const isOff    = !def.available;
          return (
            <button
              key={def.id}
              type="button"
              disabled={disabled || isOff}
              onClick={() => onSelect(def.id)}
              className="relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all disabled:cursor-not-allowed"
              style={isActive
                ? { borderColor: def.accent, background: '#ffffff', boxShadow: `0 0 0 1px ${def.accent}` }
                : { borderColor: '#dce1df', background: '#ffffff', opacity: isOff ? 0.55 : 1 }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: isActive ? def.accent : '#f6f1e8', color: isActive ? '#ffffff' : def.accent }}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#102532' }}>{def.label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{def.description}</p>
              </div>
              {isOff && (
                <span className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: '#f1f0ee', color: '#8a9bab' }}>
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}