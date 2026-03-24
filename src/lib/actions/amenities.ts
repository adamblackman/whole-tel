'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/dal'

/**
 * Upsert the full set of amenities for a property.
 * Replaces existing selections with a full delete + re-insert pattern.
 * propertyId is bound server-side — ownership is verified before any mutation.
 */
export async function upsertPropertyAmenities(
  propertyId: string,
  amenityIds: string[]
): Promise<{ error?: string }> {
  const user = await requireOwner()
  const supabase = await createClient()

  // Verify ownership before mutating
  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()

  if (!property) {
    return { error: 'Property not found or access denied.' }
  }

  // Delete all existing selections for this property
  const { error: deleteError } = await supabase
    .from('property_amenities')
    .delete()
    .eq('property_id', propertyId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // Insert new selections if any were provided
  if (amenityIds.length > 0) {
    const rows = amenityIds.map((amenity_id) => ({ property_id: propertyId, amenity_id }))
    const { error: insertError } = await supabase
      .from('property_amenities')
      .insert(rows)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  revalidatePath('/dashboard/properties/' + propertyId)
  revalidatePath('/properties/' + propertyId)

  return {}
}
