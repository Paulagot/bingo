// src/components/web3/dashboard/my-events/ScheduleEventModal.tsx

import  { useEffect, useMemo, useRef, useState } from 'react'
import {
  createEvent,
  publishEvent,
  updateEvent,
  type ContactType,
  type CreateEventPayload,
  type EventType,
  type PublicEvent,
} from '../../../../services/web3PublicEventsService'
import { CHARITIES, type Charity } from '../../../../chains/evm/config/gbcharities'
import {
  BONK_CHARITY_NAME,
  charityKey,
  FIXED_CHAIN,
  getTokensForChain,
  isBonkToken,
  isBuddiesForPaws,
  normaliseName,
} from './myEventsHelpers'
import './myEventsModal.css'

interface ScheduleModalProps {
  event?: PublicEvent | null
  onClose: () => void
  onSaved: (event: PublicEvent) => void
  hostName: string
}

const EMPTY_FORM: CreateEventPayload = {
  host_name: '',
  title: '',
  event_type: 'quiz',
  description: '',
  event_date: '',
  start_time: '',
  time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  join_url: '',
  contact_handle: '',
  contact_type: 'telegram',
  chain: FIXED_CHAIN,
  entry_fee: 0,
  fee_token: 'SOL',
  charity_id: CHARITIES[0]?.id ?? 0,
  charity_name: CHARITIES[0]?.name ?? '',
}

function eventToForm(event: PublicEvent | null | undefined, hostName: string): CreateEventPayload {
  if (!event) {
    return {
      ...EMPTY_FORM,
      host_name: hostName,
      chain: FIXED_CHAIN,
      fee_token: 'SOL',
    }
  }

  return {
    host_name: event.host_name ?? hostName,
    title: event.title ?? '',
    event_type: event.event_type ?? 'quiz',
    description: event.description ?? '',
    event_date: event.event_date ?? '',
    start_time: event.start_time ?? '',
    time_zone: event.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    join_url: event.join_url ?? '',
    contact_handle: event.contact_handle ?? '',
    contact_type: (event.contact_type ?? 'telegram') as ContactType,
    chain: FIXED_CHAIN,
  entry_fee: Number(event.entry_fee ?? 0),
    fee_token: event.fee_token ?? 'SOL',
    charity_id: event.charity_id ?? 0,
    charity_name: event.charity_name ?? '',
  }
}

export function ScheduleEventModal({
  event,
  onClose,
  onSaved,
  hostName,
}: ScheduleModalProps) {
  const isEditing = Boolean(event?.id)

  const [form, setForm] = useState<CreateEventPayload>(() => eventToForm(event, hostName))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTopButton, setShowTopButton] = useState(false)
  const [directCharities, setDirectCharities] = useState<Charity[]>([])

  const bodyRef = useRef<HTMLDivElement | null>(null)

  const isBonkSelected = isBonkToken(form.fee_token)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    fetch('/api/charities/list?chain=solana')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.charities)) {
          setDirectCharities(data.charities as Charity[])
        }
      })
      .catch(err =>
        console.warn('[ScheduleEventModal] Failed to load direct charities:', err.message)
      )
  }, [])

  const allCharities = useMemo<Charity[]>(
    () => [...CHARITIES, ...directCharities],
    [directCharities]
  )

  const buddiesForPaws = useMemo<Charity | null>(() => {
    // Important: prefer the DB/direct charity entry.
    return directCharities.find(isBuddiesForPaws) ?? null
  }, [directCharities])

  useEffect(() => {
    if (!isBonkSelected || !buddiesForPaws) return

    setForm(prev => {
      const alreadySelected =
        normaliseName(prev.charity_name ?? '') === normaliseName(buddiesForPaws.name)

      if (alreadySelected && prev.charity_id === 0) return prev

      return {
        ...prev,
        charity_id: 0,
        charity_name: buddiesForPaws.name,
      }
    })
  }, [isBonkSelected, buddiesForPaws])

  const currentCharityKey = useMemo(() => {
    if (!form.charity_id && form.charity_name) {
      const directMatch = directCharities.find(c => normaliseName(c.name) === normaliseName(form.charity_name))
      if (directMatch) return charityKey(directMatch)

      const anyMatch = allCharities.find(c => normaliseName(c.name) === normaliseName(form.charity_name))
      if (anyMatch) return charityKey(anyMatch)
    }

    return form.charity_id ? String(form.charity_id) : ''
  }, [form.charity_id, form.charity_name, directCharities, allCharities])

  const selectedCharity = useMemo(() => {
    return allCharities.find(c => charityKey(c) === currentCharityKey) ?? null
  }, [allCharities, currentCharityKey])

  function set<K extends keyof CreateEventPayload>(key: K, value: CreateEventPayload[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }

      next.chain = FIXED_CHAIN

      if (key === 'chain') {
        next.fee_token = 'SOL'
      }

      if (key === 'event_type' && value === 'elimination') {
        next.chain = FIXED_CHAIN
        next.fee_token = 'SOL'
      }

      return next
    })
  }

  function handleCharityChange(key: string) {
    if (isBonkSelected) return

    if (!key) {
      setForm(prev => ({ ...prev, charity_id: 0, charity_name: '' }))
      return
    }

    if (key.startsWith('direct:')) {
      const name = key.slice('direct:'.length)
      setForm(prev => ({ ...prev, charity_id: 0, charity_name: name }))
      return
    }

    const id = parseInt(key, 10)
    const charity = allCharities.find(c => c.id === id)

    setForm(prev => ({
      ...prev,
      charity_id: id,
      charity_name: charity?.name ?? '',
    }))
  }

  function handleBodyScroll() {
    const el = bodyRef.current
    if (!el) return
    setShowTopButton(el.scrollTop > 220)
  }

  function scrollToTop() {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollErrorIntoView() {
    window.requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  function validate(): boolean {
    const url = form.join_url.trim()

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setError('Please enter a valid URL for "Where to join" — it must start with https://')
      return false
    }

    const fee = parseFloat(String(form.entry_fee))
    if (!form.entry_fee || isNaN(fee) || fee <= 0) {
      setError('Please enter a valid entry fee greater than 0')
      return false
    }

    if (!form.host_name?.trim()) {
      setError('Community / host name is required')
      return false
    }

    if (!form.title?.trim()) {
      setError('Event title is required')
      return false
    }

    if (!form.event_date?.trim()) {
      setError('Event date is required')
      return false
    }

    if (!form.start_time?.trim()) {
      setError('Start time is required')
      return false
    }

    if (!form.description?.trim()) {
      setError('Description is required')
      return false
    }

    if (!form.contact_handle?.trim()) {
      setError('Contact handle is required')
      return false
    }

    if (!form.charity_name?.trim()) {
      setError('Please select a charity')
      return false
    }

    if (isBonkSelected && !buddiesForPaws) {
      setError('BONK events must use Buddies for Paws, but it was not found in the direct charity list.')
      return false
    }

    return true
  }

  async function handleSave(publishAfterSave: boolean) {
    setError(null)

    if (!validate()) {
      scrollErrorIntoView()
      return
    }

    setSaving(true)

    try {
      const payload: CreateEventPayload = {
        ...form,
        chain: FIXED_CHAIN,
        fee_token: String(form.fee_token).toUpperCase(),
      }

      let savedEvent: PublicEvent

      if (isEditing && event?.id) {
        const result = await updateEvent(event.id, payload)
        savedEvent = result.event
      } else {
        const result = await createEvent(payload)
        savedEvent = result.event
      }

      if (publishAfterSave && savedEvent.status === 'draft') {
        await publishEvent(savedEvent.id)

        const published = await import('../../../../services/web3PublicEventsService').then(m =>
          m.getEventById(savedEvent.id)
        )

        savedEvent = published.event
      }

      onSaved(savedEvent)
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save event')
      scrollErrorIntoView()
    } finally {
      setSaving(false)
    }
  }

  const tokens = getTokensForChain(FIXED_CHAIN)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fl-modal-overlay" role="presentation">
      <div
        className="fl-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-event-title"
      >
        <div className="fl-modal-handle" />

        <div className="fl-modal-header">
          <div>
            <h2 id="schedule-event-title" className="fl-modal-title">
              {isEditing ? 'Edit Event' : 'List an Event'}
            </h2>

            <p className="fl-modal-subtitle">
              {isEditing
                ? 'Update your event listing details and keep the marketplace accurate.'
                : 'Create a public event listing for the marketplace so people can discover and join your fundraiser.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="fl-close-btn"
            aria-label="Close"
            type="button"
            disabled={saving}
          >
            ×
          </button>
        </div>

        {showTopButton && (
          <button type="button" className="fl-scroll-top" onClick={scrollToTop}>
            ↑ Top
          </button>
        )}

        <div ref={bodyRef} className="fl-modal-body" onScroll={handleBodyScroll}>
          {error && <div className="fl-error-banner">{error}</div>}

          <section className="fl-section-card">
            <div className="fl-section-head">
              <span className="fl-section-kicker">Section 1</span>
              <h3 className="fl-section-title">About your event</h3>
              <p className="fl-section-copy">
                Add the basics people will see first when they discover your event.
              </p>
            </div>

            <div className="fl-field">
              <label className="fl-field-label">
                Community / host name <span className="fl-req">*</span>
              </label>
              <input
                className="fl-input"
                value={form.host_name}
                onChange={e => set('host_name', e.target.value)}
                placeholder="e.g. DeFi Dublin"
                maxLength={255}
              />
            </div>

            <div className="fl-field">
              <label className="fl-field-label">
                Event title <span className="fl-req">*</span>
              </label>
              <input
                className="fl-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Web3 Trivia Night #5"
                maxLength={255}
              />
            </div>

            <div className="fl-field">
              <label className="fl-field-label">
                Event type <span className="fl-req">*</span>
              </label>
              <select
                className={`fl-select${!form.event_type ? ' fl-placeholder' : ''}`}
                value={form.event_type}
                onChange={e => set('event_type', e.target.value as EventType)}
              >
                <option value="" disabled>Please select…</option>
                <option value="quiz">Quiz</option>
                <option value="elimination">Elimination</option>
              </select>
            </div>

            <div className="fl-field">
              <label className="fl-field-label">
                Description <span className="fl-req">*</span>
              </label>
              <textarea
                className="fl-textarea"
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                placeholder="e.g. Join us for a fun live fundraiser where every entry has real impact."
                maxLength={280}
                rows={4}
              />
              <div className="fl-char-count">{(form.description ?? '').length} / 280</div>
            </div>
          </section>

          <section className="fl-section-card">
            <div className="fl-section-head">
              <span className="fl-section-kicker">Section 2</span>
              <h3 className="fl-section-title">Date &amp; time</h3>
            </div>

            <div className="fl-form-row">
              <div className="fl-field">
                <label className="fl-field-label">
                  Date <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  type="date"
                  value={form.event_date}
                  min={today}
                  onChange={e => set('event_date', e.target.value)}
                />
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Start time <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  type="time"
                  value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                />
              </div>
            </div>

            <div className="fl-field">
              <label className="fl-field-label">
                Timezone <span className="fl-req">*</span>
              </label>
              <input
                className="fl-input"
                value={form.time_zone}
                onChange={e => set('time_zone', e.target.value)}
                placeholder="e.g. Europe/Dublin"
              />
              <span className="fl-help-text">Auto-detected from your browser.</span>
            </div>
          </section>

          <section className="fl-section-card">
            <div className="fl-section-head">
              <span className="fl-section-kicker">Section 3</span>
              <h3 className="fl-section-title">Where &amp; how to join</h3>
            </div>

            <div className="fl-field">
              <label className="fl-field-label">
                Join link <span className="fl-req">*</span>
              </label>
              <input
                className="fl-input"
                type="text"
                value={form.join_url}
                onChange={e => set('join_url', e.target.value)}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
                    set('join_url', `https://${v}`)
                  }
                }}
                placeholder="https://discord.gg/your-server"
              />
              <span className="fl-help-text">
                Discord, Zoom, X Space, Telegram, Luma, Eventbrite, etc.
              </span>
            </div>

            <div className="fl-form-row">
              <div className="fl-field">
                <label className="fl-field-label">
                  Contact type <span className="fl-req">*</span>
                </label>
                <select
                  className={`fl-select${!form.contact_type ? ' fl-placeholder' : ''}`}
                  value={form.contact_type}
                  onChange={e => set('contact_type', e.target.value as ContactType)}
                >
                  <option value="" disabled>Please select…</option>
                  {(['telegram', 'x', 'discord', 'whatsapp', 'email', 'other'] as ContactType[]).map(t => (
                    <option key={t} value={t}>
                      {t === 'x' ? 'X (Twitter)' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Contact handle <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  value={form.contact_handle}
                  onChange={e => set('contact_handle', e.target.value)}
                  placeholder="@handle or email"
                  maxLength={255}
                />
              </div>
            </div>
          </section>

          <section className="fl-section-card">
            <div className="fl-section-head">
              <span className="fl-section-kicker">Section 4</span>
              <h3 className="fl-section-title">Entry &amp; charity</h3>
              <p className="fl-section-copy">
                Confirm the chain, price to join, token, and the cause this event supports.
              </p>
            </div>

            <div className="fl-field">
              <label className="fl-field-label">Chain</label>
              <input className="fl-input" value="Solana" disabled />
            </div>

            <div className="fl-form-row">
              <div className="fl-field">
                <label className="fl-field-label">
                  Entry fee <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  type="text"
                  inputMode="decimal"
                  value={form.entry_fee || ''}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '' || /^\d*\.?\d{0,8}$/.test(v)) {
                      set('entry_fee', v as any)
                    }
                  }}
                  placeholder="e.g. 0.01"
                />
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Token <span className="fl-req">*</span>
                </label>
                <select
                  className="fl-select"
                  value={form.fee_token}
                  onChange={e => set('fee_token', e.target.value)}
                >
                  {tokens.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isBonkSelected && (
              <div className="fl-impact-banner">
                <span className="fl-impact-title">BONK impact boost</span>
                The charity portion of this event will be matched by Buddies for Paws with BONK,
                so your event can create even greater impact.
              </div>
            )}

            <div className="fl-field">
              <label className="fl-field-label">
                Charity / cause <span className="fl-req">*</span>
              </label>

              <select
                className={`fl-select${!currentCharityKey ? ' fl-placeholder' : ''}`}
                value={currentCharityKey}
                onChange={e => handleCharityChange(e.target.value)}
                disabled={isBonkSelected}
              >
                <option value="" disabled>
                  {isBonkSelected && !buddiesForPaws
                    ? 'Loading Buddies for Paws…'
                    : 'Please select a charity…'}
                </option>

                <optgroup label="Via The Giving Block">
                  {CHARITIES.map(c => (
                    <option key={charityKey(c)} value={charityKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>

                {directCharities.length > 0 && (
                  <optgroup label="Direct Donation">
                    {directCharities.map(c => (
                      <option key={charityKey(c)} value={charityKey(c)}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {isBonkSelected && buddiesForPaws && (
                <span className="fl-help-text">
                  Locked to {BONK_CHARITY_NAME} because BONK events use the Buddies for Paws matching flow.
                </span>
              )}

              {!isBonkSelected && selectedCharity && (
                <span className="fl-help-text">
                  {selectedCharity.direct
                    ? '✓ Direct donation - self hosted wallet by charity'
                    : `TGB Org ID: ${form.charity_id}`}
                </span>
              )}

              {isBonkSelected && !buddiesForPaws && (
                <span className="fl-help-text">
                  BONK requires Buddies for Paws. It should be available from the direct charity list.
                </span>
              )}
            </div>
          </section>

          <div className="fl-bottom-spacer" />
        </div>

        <div className="fl-modal-footer">
          <button
            className="fl-btn-cancel"
            onClick={onClose}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>

          <button
            className="fl-btn-draft"
            onClick={() => handleSave(false)}
            disabled={saving}
            type="button"
          >
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save draft'}
          </button>

          <button
            className="fl-btn-publish"
            onClick={() => handleSave(true)}
            disabled={saving}
            type="button"
          >
            {saving
              ? 'Saving…'
              : isEditing
                ? event?.status === 'draft'
                  ? 'Save & publish'
                  : 'Save changes'
                : 'Save & publish'}
          </button>
        </div>
      </div>
    </div>
  )
}