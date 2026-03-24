import { z } from 'zod'

/**
 * Returns true if two monetary amounts are equal when compared in cents.
 * Handles floating-point edge cases like 0.1 + 0.2 === 0.3.
 */
export function centsEqual(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100)
}

/** Schema for a single attendee split entry. */
export const splitPaymentSchema = z.object({
  invitationId: z.string().uuid(),
  amount: z.number().positive(),
})

/** Schema for saving a complete set of splits for a booking. */
export const saveSplitsSchema = z.object({
  bookingId: z.string().uuid(),
  splits: z.array(splitPaymentSchema).min(1),
})

/** Schema for generating a Stripe Payment Link for an individual split. */
export const generatePaymentLinkSchema = z.object({
  bookingId: z.string().uuid(),
  invitationId: z.string().uuid(),
})

export type SplitPaymentInput = z.infer<typeof splitPaymentSchema>
export type SaveSplitsInput = z.infer<typeof saveSplitsSchema>
export type GeneratePaymentLinkInput = z.infer<typeof generatePaymentLinkSchema>
