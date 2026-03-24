import { describe, it, expect } from 'vitest'
import { isEventDateInRange, isDeadlinePassed } from './itinerary'

// These test the pure validation logic extracted from Server Actions.
// Server Actions themselves cannot be unit-tested (need Supabase),
// but the date range and deadline checks are pure functions.

describe('isEventDateInRange', () => {
  const checkIn = '2025-07-10'
  const checkOut = '2025-07-15'

  it('rejects event_date before check_in', () => {
    expect(isEventDateInRange('2025-07-09', checkIn, checkOut)).toBe(false)
  })

  it('rejects event_date on check_out day (guests depart on checkout day)', () => {
    expect(isEventDateInRange('2025-07-15', checkIn, checkOut)).toBe(false)
  })

  it('accepts event_date equal to check_in', () => {
    expect(isEventDateInRange('2025-07-10', checkIn, checkOut)).toBe(true)
  })

  it('accepts event_date one day before check_out', () => {
    expect(isEventDateInRange('2025-07-14', checkIn, checkOut)).toBe(true)
  })
})

describe('isDeadlinePassed', () => {
  it('rejects when current date is past activity_deadline', () => {
    const deadline = '2025-07-01T12:00:00Z'
    const now = new Date('2025-07-02T00:00:00Z')
    expect(isDeadlinePassed(deadline, now)).toBe(true)
  })

  it('allows when activity_deadline is null (no deadline set)', () => {
    expect(isDeadlinePassed(null)).toBe(false)
  })

  it('allows when current date is before activity_deadline', () => {
    const deadline = '2025-07-10T12:00:00Z'
    const now = new Date('2025-07-01T00:00:00Z')
    expect(isDeadlinePassed(deadline, now)).toBe(false)
  })
})
