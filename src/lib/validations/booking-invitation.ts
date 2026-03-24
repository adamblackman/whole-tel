import { z } from 'zod'

export const sendInvitationSchema = z.object({
  bookingId: z.string().uuid(),
  email: z.string().email('Please enter a valid email address'),
})

export const updateGuestCountSchema = z.object({
  bookingId: z.string().uuid(),
  guestCount: z.number().int().min(1, 'At least 1 guest required'),
})

export const acceptInvitationSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(100),
  phone: z.string().min(7, 'Phone number is required').max(20),
})

export const addAttendeeManuallySchema = z.object({
  bookingId: z.string().uuid(),
  fullName: z.string().min(2, 'Full name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(7, 'Phone number is required').max(20),
})
