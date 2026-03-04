'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/dal'
import { PropertySchema, type ActionState } from '@/lib/validations/property'

/**
 * Create a new property.
 * owner_id is always derived from requireOwner() — never from formData.
 */
export async function createProperty(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireOwner()

  const parsed = PropertySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  // Parse amenities string into a JSON array
  const { amenities: amenitiesRaw, ...rest } = parsed.data
  const amenitiesArray =
    amenitiesRaw && amenitiesRaw.trim().length > 0
      ? amenitiesRaw
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : []

  const supabase = await createClient()
  const { error } = await supabase
    .from('properties')
    .insert({ ...rest, amenities: amenitiesArray, owner_id: user.id })

  if (error) {
    return { message: error.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

/**
 * Update an existing property.
 * propertyId is bound via updateProperty.bind(null, propertyId) in the Client Component.
 * .eq('owner_id', user.id) is UI-layer defense; RLS is the DB-layer defense.
 */
export async function updateProperty(
  propertyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireOwner()

  const parsed = PropertySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { amenities: amenitiesRaw, ...rest } = parsed.data
  const amenitiesArray =
    amenitiesRaw && amenitiesRaw.trim().length > 0
      ? amenitiesRaw
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : []

  const supabase = await createClient()
  const { error } = await supabase
    .from('properties')
    .update({ ...rest, amenities: amenitiesArray })
    .eq('id', propertyId)
    .eq('owner_id', user.id)

  if (error) {
    return { message: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/properties/${propertyId}`)
  redirect(`/dashboard/properties/${propertyId}`)
}

/**
 * Delete a property.
 * Direct call (no useActionState) — invoked from a confirmation dialog.
 */
export async function deleteProperty(propertyId: string): Promise<ActionState> {
  const user = await requireOwner()

  const supabase = await createClient()
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('owner_id', user.id)

  if (error) {
    return { message: error.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
