import { requireOwner } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { PropertyCard } from '@/components/dashboard/PropertyCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const user = await requireOwner()
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select(`
      id, name, location, bedrooms, bathrooms, max_guests, nightly_rate,
      property_photos(id, storage_path, display_order)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Properties</h1>
        <Button asChild>
          <Link href="/dashboard/properties/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Link>
        </Button>
      </div>

      {/* Property grid or empty state */}
      {!properties || properties.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t listed any properties yet. Add your first property to get started.
          </p>
          <Button asChild>
            <Link href="/dashboard/properties/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Property
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
