'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { ActivitySchema, ActivityInput } from '@/lib/validations/activity'

/**
 * Create a new activity for a property.
 * Ownership is enforced by RLS — only the property owner can insert.
 */
export async function createActivity(
  propertyId: string,
  input: ActivityInput
): Promise<{ error?: string; id?: string }> {
  await verifySession()
  const supabase = await createClient()

  const parsed = ActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid activity data' }
  }

  const { name, description, duration_min, available_slots } = parsed.data

  const { data, error } = await supabase
    .from('property_activities')
    .insert({
      property_id: propertyId,
      name,
      description: description ?? null,
      duration_min,
      available_slots: JSON.stringify(available_slots),
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}/activities`)

  return { id: data.id }
}

/**
 * Update an existing activity.
 * RLS ensures only the property owner can update.
 * propertyId is required for revalidatePath — avoids an extra DB query.
 */
export async function updateActivity(
  activityId: string,
  propertyId: string,
  input: ActivityInput
): Promise<{ error?: string }> {
  await verifySession()
  const supabase = await createClient()

  const parsed = ActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid activity data' }
  }

  const { name, description, duration_min, available_slots } = parsed.data

  const { error } = await supabase
    .from('property_activities')
    .update({
      name,
      description: description ?? null,
      duration_min,
      available_slots: JSON.stringify(available_slots),
      updated_at: new Date().toISOString(),
    })
    .eq('id', activityId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}/activities`)

  return {}
}

/**
 * Delete an activity by ID.
 * RLS ensures only the property owner can delete.
 * propertyId is required for revalidatePath — avoids an extra DB query.
 */
export async function deleteActivity(
  activityId: string,
  propertyId: string
): Promise<{ error?: string }> {
  await verifySession()
  const supabase = await createClient()

  const { error } = await supabase
    .from('property_activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}/activities`)

  return {}
}
