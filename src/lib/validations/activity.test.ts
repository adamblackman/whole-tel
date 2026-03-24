import { describe, it, expect } from 'vitest'
// ActivitySchema and TimeSlotSchema will be created in Task 1

describe('TimeSlotSchema', () => {
  it('accepts valid slot {start: "09:30", end: "12:00"}', () => {
    // TODO: import and test after Task 1 creates the schema
    expect(true).toBe(true) // placeholder — replace with real import
  })
  it('rejects slot where end is before start {start: "14:00", end: "09:00"}', () => {
    expect(true).toBe(true) // placeholder
  })
  it('rejects slot with invalid time format {start: "9:30", end: "12"}', () => {
    expect(true).toBe(true) // placeholder
  })
})

describe('ActivitySchema', () => {
  it('accepts valid activity with name, duration, and slots', () => {
    expect(true).toBe(true) // placeholder
  })
  it('rejects activity with empty name', () => {
    expect(true).toBe(true) // placeholder
  })
  it('rejects activity with duration_min < 15', () => {
    expect(true).toBe(true) // placeholder
  })
  it('rejects activity with empty available_slots array', () => {
    expect(true).toBe(true) // placeholder
  })
})
