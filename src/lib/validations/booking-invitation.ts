import { z } from 'zod'

export const sendInvitationSchema = z.object({
  bookingId: z.string().uuid(),
  email: z.string().email('Please enter a valid email address'),
})

export const updateGuestCountSchema = z.object({
  bookingId: z.string().uuid(),
  guestCount: z.number().int().min(1, 'At least 1 guest required'),
})
