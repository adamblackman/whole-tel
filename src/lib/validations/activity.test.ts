import { describe, it, expect } from 'vitest'
import { TimeSlotSchema, ActivitySchema } from './activity'

describe('TimeSlotSchema', () => {
  it('accepts valid slot {start: "09:30", end: "12:00"}', () => {
    const result = TimeSlotSchema.safeParse({ start: '09:30', end: '12:00' })
    expect(result.success).toBe(true)
  })
  it('rejects slot where end is before start {start: "14:00", end: "09:00"}', () => {
    const result = TimeSlotSchema.safeParse({ start: '14:00', end: '09:00' })
    expect(result.success).toBe(false)
  })
  it('rejects slot with invalid time format {start: "9:30", end: "12"}', () => {
    const result = TimeSlotSchema.safeParse({ start: '9:30', end: '12' })
    expect(result.success).toBe(false)
  })
})

describe('ActivitySchema', () => {
  it('accepts valid activity with name, duration, and slots', () => {
    const result = ActivitySchema.safeParse({
      name: 'Sunset Kayak Tour',
      description: 'Paddle through mangroves at dusk',
      duration_min: 90,
      available_slots: [{ start: '17:00', end: '18:30' }],
    })
    expect(result.success).toBe(true)
  })
  it('rejects activity with empty name', () => {
    const result = ActivitySchema.safeParse({
      name: '',
      duration_min: 60,
      available_slots: [{ start: '09:00', end: '10:00' }],
    })
    expect(result.success).toBe(false)
  })
  it('rejects activity with duration_min < 15', () => {
    const result = ActivitySchema.safeParse({
      name: 'Quick Tour',
      duration_min: 10,
      available_slots: [{ start: '09:00', end: '10:00' }],
    })
    expect(result.success).toBe(false)
  })
  it('rejects activity with empty available_slots array', () => {
    const result = ActivitySchema.safeParse({
      name: 'Yoga Session',
      duration_min: 60,
      available_slots: [],
    })
    expect(result.success).toBe(false)
  })
})
