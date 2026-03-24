import { requireOwner } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ActivityEditor } from '@/components/dashboard/ActivityEditor'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { PropertyActivity } from '@/types/database'

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  await requireOwner()
  const { propertyId } = await params
  const supabase = await createClient()

  const [propertyResult, activitiesResult] = await Promise.all([
    supabase
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .single(),
    supabase
      .from('property_activities')
      .select('id, property_id, name, description, duration_min, available_slots, is_active, created_at, updated_at')
      .eq('property_id', propertyId)
      .order('created_at'),
  ])

  if (!propertyResult.data) notFound()

  const property = propertyResult.data
  const activities = (activitiesResult.data ?? []) as PropertyActivity[]

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href={`/dashboard/properties/${propertyId}/edit`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Edit Property
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Activities &mdash; {property.name}</h1>
      </div>

      <ActivityEditor propertyId={propertyId} initialActivities={activities} />
    </div>
  )
}
