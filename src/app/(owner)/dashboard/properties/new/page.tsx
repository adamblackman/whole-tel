'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PropertyForm } from '@/components/dashboard/PropertyForm'
import { PhotoManager } from '@/components/dashboard/PhotoManager'
import { createProperty } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowRight } from 'lucide-react'
import type { ActionState } from '@/lib/validations/property'

export default function NewPropertyPage() {
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null)

  const wrappedAction = async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
    const result = await createProperty(prevState, formData)
    if (result.propertyId) {
      setCreatedPropertyId(result.propertyId)
    }
    return result
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Add New Property</h1>
        <PropertyForm action={wrappedAction} submitLabel="Create Property" />
      </div>

      {createdPropertyId ? (
        <>
          <Separator />

          <section>
            <PhotoManager
              propertyId={createdPropertyId}
              photos={[]}
            />
          </section>

          <Separator />

          <Button asChild>
            <Link href={`/dashboard/properties/${createdPropertyId}`}>
              Continue to Property
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : (
        <Separator />
      )}
    </div>
  )
}
