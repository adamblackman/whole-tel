import { describe, it, expect } from 'vitest'
import {
  centsEqual,
  splitPaymentSchema,
  saveSplitsSchema,
  generatePaymentLinkSchema,
} from './split-payment'

describe('centsEqual', () => {
  it('handles floating-point imprecision: 0.1 + 0.2 equals 0.3', () => {
    expect(centsEqual(0.1 + 0.2, 0.3)).toBe(true)
  })

  it('returns false when values differ by 1 cent', () => {
    expect(centsEqual(500.00, 500.01)).toBe(false)
  })

  it('returns true for identical values', () => {
    expect(centsEqual(1234.56, 1234.56)).toBe(true)
  })

  it('returns false for clearly different values', () => {
    expect(centsEqual(100.00, 200.00)).toBe(false)
  })
})

describe('splitPaymentSchema', () => {
  it('accepts valid split with UUID and positive amount', () => {
    const result = splitPaymentSchema.safeParse({
      invitationId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 250.00,
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID invitationId', () => {
    const result = splitPaymentSchema.safeParse({
      invitationId: 'not-a-uuid',
      amount: 250.00,
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = splitPaymentSchema.safeParse({
      invitationId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = splitPaymentSchema.safeParse({
      invitationId: '123e4567-e89b-12d3-a456-426614174000',
      amount: -50,
    })
    expect(result.success).toBe(false)
  })
})

describe('saveSplitsSchema', () => {
  const validSplit = {
    invitationId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 500.00,
  }
  const validBookingId = '987fcdeb-51a2-43d7-b654-123456789abc'

  it('accepts valid splits with positive amounts', () => {
    const result = saveSplitsSchema.safeParse({
      bookingId: validBookingId,
      splits: [validSplit],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty splits array', () => {
    const result = saveSplitsSchema.safeParse({
      bookingId: validBookingId,
      splits: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID bookingId', () => {
    const result = saveSplitsSchema.safeParse({
      bookingId: 'not-a-uuid',
      splits: [validSplit],
    })
    expect(result.success).toBe(false)
  })

  it('rejects splits containing a negative amount', () => {
    const result = saveSplitsSchema.safeParse({
      bookingId: validBookingId,
      splits: [{ invitationId: '123e4567-e89b-12d3-a456-426614174000', amount: -100 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects splits containing a zero amount', () => {
    const result = saveSplitsSchema.safeParse({
      bookingId: validBookingId,
      splits: [{ invitationId: '123e4567-e89b-12d3-a456-426614174000', amount: 0 }],
    })
    expect(result.success).toBe(false)
  })
})

describe('generatePaymentLinkSchema', () => {
  it('rejects non-UUID bookingId', () => {
    const result = generatePaymentLinkSchema.safeParse({
      bookingId: 'bad-id',
      invitationId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID invitationId', () => {
    const result = generatePaymentLinkSchema.safeParse({
      bookingId: '987fcdeb-51a2-43d7-b654-123456789abc',
      invitationId: 'bad-id',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid UUIDs for both fields', () => {
    const result = generatePaymentLinkSchema.safeParse({
      bookingId: '987fcdeb-51a2-43d7-b654-123456789abc',
      invitationId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
  })
})
