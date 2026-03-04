import { PropertyForm } from '@/components/dashboard/PropertyForm'
import { createProperty } from '@/lib/actions/properties'

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add New Property</h1>
      <PropertyForm action={createProperty} submitLabel="Create Property" />
    </div>
  )
}
