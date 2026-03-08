export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
export type PricingUnit = 'per_person' | 'per_booking'
export type UserRole = 'guest' | 'owner'

export interface BedConfig {
  king: number
  queen: number
  double: number
  twin: number
  bunk: number
}

export const DEFAULT_BED_CONFIG: BedConfig = {
  king: 0,
  queen: 0,
  double: 0,
  twin: 0,
  bunk: 0,
}

export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  owner_id: string
  name: string
  description: string | null
  location: string
  address: string | null
  bedrooms: number
  bathrooms: number
  max_guests: number
  nightly_rate: number
  cleaning_fee: number
  amenities: Json
  house_rules: string | null
  bed_config: BedConfig
  guest_threshold: number | null
  per_person_rate: number | null
  check_in_time: string
  check_out_time: string
  created_at: string
  updated_at: string
}

export interface PropertyPhoto {
  id: string
  property_id: string
  storage_path: string
  display_order: number
  created_at: string
}

export interface AddOn {
  id: string
  property_id: string
  name: string
  description: string | null
  price: number
  pricing_unit: PricingUnit
  max_quantity: number | null
  included_guests: number | null
  per_person_above: number | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  property_id: string
  guest_id: string
  check_in: string
  check_out: string
  guest_count: number
  subtotal: number
  add_ons_total: number
  processing_fee: number
  total: number
  status: BookingStatus
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  created_at: string
  updated_at: string
}

export interface BookingAddOn {
  id: string
  booking_id: string
  add_on_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

// Joined types for common query patterns
export interface PropertyWithAddOns extends Property {
  add_ons: AddOn[]
  property_photos: PropertyPhoto[]
}

export interface BookingWithDetails extends Booking {
  property: Property
  booking_add_ons: (BookingAddOn & { add_on: AddOn })[]
}

// Database namespace for Supabase client typing (optional — use if generating full types)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      properties: { Row: Property; Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Property> }
      property_photos: { Row: PropertyPhoto; Insert: Omit<PropertyPhoto, 'id' | 'created_at'>; Update: Partial<PropertyPhoto> }
      add_ons: { Row: AddOn; Insert: Omit<AddOn, 'id' | 'created_at' | 'updated_at'>; Update: Partial<AddOn> }
      bookings: { Row: Booking; Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Booking> }
      booking_add_ons: { Row: BookingAddOn; Insert: Omit<BookingAddOn, 'id' | 'created_at'>; Update: Partial<BookingAddOn> }
    }
  }
}
