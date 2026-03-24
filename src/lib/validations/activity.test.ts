import { describe, it, expect } from 'vitest'
import { TimeSlotSchema, AddOnSchema } from './add-on'

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

describe('AddOnSchema — scheduling fields', () => {
  const baseAddOn = {
    name: 'Sunset Kayak Tour',
    price: '50',
    pricing_unit: 'per_person',
    included_guests: '',
    per_person_above: '',
  }

  it('accepts add-on with time slots and duration', () => {
    const result = AddOnSchema.safeParse({
      ...baseAddOn,
      duration_min: '90',
      available_slots: JSON.stringify([{ start: '17:00', end: '18:30' }]),
    })
    expect(result.success).toBe(true)
  })

  it('accepts add-on without time slots (pure pricing experience)', () => {
    const result = AddOnSchema.safeParse({
      ...baseAddOn,
      duration_min: '',
      available_slots: '[]',
    })
    expect(result.success).toBe(true)
  })

  it('rejects add-on with time slots but no duration', () => {
    const result = AddOnSchema.safeParse({
      ...baseAddOn,
      duration_min: '',
      available_slots: JSON.stringify([{ start: '09:00', end: '10:00' }]),
    })
    expect(result.success).toBe(false)
  })

  it('rejects duration_min < 15', () => {
    const result = AddOnSchema.safeParse({
      ...baseAddOn,
      duration_min: '10',
      available_slots: JSON.stringify([{ start: '09:00', end: '10:00' }]),
    })
    expect(result.success).toBe(false)
  })
})
