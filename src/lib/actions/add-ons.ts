'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/dal'
import { AddOnSchema } from '@/lib/validations/add-on'
import type { ActionState } from '@/lib/validations/property'

/**
 * Create a new add-on for a property.
 * propertyId is bound via createAddOn.bind(null, propertyId).
 * RLS "Owners can insert add-ons for their properties" enforces ownership at DB layer.
 */
export async function createAddOn(
  propertyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireOwner()

  const parsed = AddOnSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('add_ons')
    .insert({ ...parsed.data, property_id: propertyId })

  if (error) {
    return { message: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { message: 'Add-on created successfully' }
}

/**
 * Update an existing add-on.
 * addOnId and propertyId are both bound via updateAddOn.bind(null, addOnId, propertyId).
 * RLS UPDATE policy enforces ownership via EXISTS subquery.
 */
export async function updateAddOn(
  addOnId: string,
  propertyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireOwner()

  const parsed = AddOnSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('add_ons')
    .update(parsed.data)
    .eq('id', addOnId)

  if (error) {
    return { message: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { message: 'Add-on updated successfully' }
}

/**
 * Delete an add-on.
 * Direct call (no useActionState) — invoked from a confirmation dialog.
 * RLS DELETE policy enforces ownership.
 */
export async function deleteAddOn(
  addOnId: string,
  propertyId: string
): Promise<ActionState> {
  await requireOwner()

  const supabase = await createClient()
  const { error } = await supabase.from('add_ons').delete().eq('id', addOnId)

  if (error) {
    return { message: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { message: 'Add-on deleted' }
}
