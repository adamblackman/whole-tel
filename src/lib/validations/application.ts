import { z } from 'zod'

export const PropertyBasicsSchema = z.object({
  propertyName: z.string().min(2, 'Property name must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  propertyType: z.enum(['villa', 'estate', 'boutique_hotel'], {
    error: 'Please select a property type',
  }),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters'),
})

export const CapacitySchema = z.object({
  maxGuests: z.coerce
    .number()
    .int()
    .min(2, 'Must accommodate at least 2 guests')
    .max(500, 'Cannot exceed 500 guests'),
  bedrooms: z.coerce.number().int().min(1, 'Must have at least 1 bedroom'),
  bathrooms: z.coerce.number().int().min(1, 'Must have at least 1 bathroom'),
  bedConfig: z.object({
    king: z.coerce.number().int().min(0).default(0),
    queen: z.coerce.number().int().min(0).default(0),
    double: z.coerce.number().int().min(0).default(0),
    twin: z.coerce.number().int().min(0).default(0),
    bunk: z.coerce.number().int().min(0).default(0),
  }),
})

export const CommonAreasSchema = z.object({
  hasPool: z.boolean(),
  hasHotTub: z.boolean(),
  outdoorSpaces: z.string().optional(),
  kitchenType: z.enum(['full', 'commercial', 'basic', 'none'], {
    error: 'Please select a kitchen type',
  }),
  notableAmenities: z.string().optional(),
})

export const GroupHostingSchema = z.object({
  hasGroupExperience: z.boolean(),
  groupExperienceDetails: z.string().optional(),
  maxGroupSize: z.coerce.number().int().min(1).optional(),
  uniqueForGroups: z
    .string()
    .min(10, 'Please describe what makes your property unique for groups (min 10 characters)'),
})

export const LogisticsSchema = z.object({
  checkInTime: z.string().min(1, 'Check-in time is required'),
  checkOutTime: z.string().min(1, 'Check-out time is required'),
  minimumStay: z.coerce.number().int().min(1, 'Minimum stay must be at least 1 night'),
  photoLinks: z.string().optional(),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  contactEmail: z.string().email('Please enter a valid email address'),
  contactPhone: z.string().min(7, 'Please enter a valid phone number'),
})

export const ApplicationSchema = z.object({
  propertyBasics: PropertyBasicsSchema,
  capacity: CapacitySchema,
  commonAreas: CommonAreasSchema,
  groupHosting: GroupHostingSchema,
  logistics: LogisticsSchema,
})

export type PropertyBasicsData = z.infer<typeof PropertyBasicsSchema>
export type CapacityData = z.infer<typeof CapacitySchema>
export type CommonAreasData = z.infer<typeof CommonAreasSchema>
export type GroupHostingData = z.infer<typeof GroupHostingSchema>
export type LogisticsData = z.infer<typeof LogisticsSchema>
export type ApplicationData = z.infer<typeof ApplicationSchema>
