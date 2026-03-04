'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/dal'

/**
 * Generates a signed upload URL for uploading a photo directly from the browser
 * to Supabase Storage. Verifies that the property belongs to the current owner
 * before generating the URL.
 *
 * Storage path uses crypto.randomUUID() to prevent collisions.
 * Note: No file extension in path — Supabase Storage uses content-type headers.
 */
export async function getSignedUploadUrl(
  propertyId: string
): Promise<{ signedUrl: string; token: string; path: string } | { error: string }> {
  const user = await requireOwner()
  const supabase = await createClient()

  // Verify the property belongs to this owner before generating a signed URL
  const { data: prop } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()

  if (!prop) return { error: 'Property not found or access denied' }

  // Unique path prevents collision — no Date.now() risk
  const path = `${user.id}/${propertyId}/${crypto.randomUUID()}`

  const { data, error } = await supabase.storage
    .from('property-photos')
    .createSignedUploadUrl(path)

  if (error) return { error: error.message }

  return { signedUrl: data.signedUrl, token: data.token, path }
}

/**
 * Saves a photo record to the database after a successful client-side upload.
 * RLS INSERT policy on property_photos verifies ownership via EXISTS subquery.
 * Sets display_order based on the current photo count.
 */
export async function savePhotoRecord(
  propertyId: string,
  storagePath: string
): Promise<{ error?: string }> {
  await requireOwner()
  const supabase = await createClient()

  // Count existing photos to determine display_order
  const { count } = await supabase
    .from('property_photos')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', propertyId)

  const { error } = await supabase.from('property_photos').insert({
    property_id: propertyId,
    storage_path: storagePath,
    display_order: count ?? 0,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath('/dashboard')
  return {}
}

/**
 * Deletes a photo — removes the storage object first, then the database record.
 * Storage deletion failure is logged but does not block DB record removal.
 * RLS DELETE policy enforces ownership via EXISTS subquery on properties.
 */
export async function deletePhoto(
  photoId: string,
  propertyId: string,
  storagePath: string
): Promise<{ error?: string }> {
  await requireOwner()
  const supabase = await createClient()

  // Delete from storage first — log but don't block on failure
  const { error: storageError } = await supabase.storage
    .from('property-photos')
    .remove([storagePath])

  if (storageError) {
    console.error('Storage deletion failed (continuing with DB removal):', storageError.message)
  }

  // Delete the database record — RLS enforces ownership
  const { error: dbError } = await supabase
    .from('property_photos')
    .delete()
    .eq('id', photoId)

  if (dbError) return { error: dbError.message }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath('/dashboard')
  return {}
}
