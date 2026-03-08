'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddOnForm } from './AddOnForm'
import { createAddOn, updateAddOn, deleteAddOn } from '@/lib/actions/add-ons'

interface AddOnListProps {
  propertyId: string
  addOns: Array<{
    id: string
    name: string
    description: string | null
    price: number
    pricing_unit: 'per_person' | 'per_booking'
    max_quantity: number | null
    photo_url: string | null
  }>
}

export function AddOnList({ propertyId, addOns }: AddOnListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  async function handleDelete(addOnId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteAddOn(addOnId, propertyId)
  }

  const boundCreateAction = createAddOn.bind(null, propertyId)

  return (
    <div className="space-y-4">
      {addOns.length === 0 && !showCreateForm && (
        <p className="text-sm text-muted-foreground">
          No experiences added yet. Add something special for your guests.
        </p>
      )}

      {/* Add-on items */}
      {addOns.map((addOn) => (
        <div key={addOn.id} className="border rounded-lg p-4">
          {editingId === addOn.id ? (
            <AddOnForm
              action={updateAddOn.bind(null, addOn.id, propertyId)}
              initialData={addOn}
              addOnId={addOn.id}
              propertyId={propertyId}
              submitLabel="Save Changes"
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{addOn.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    ${addOn.price}{' '}
                    {addOn.pricing_unit === 'per_person' ? '/ person' : '/ booking'}
                  </Badge>
                  {addOn.max_quantity && (
                    <Badge variant="outline" className="text-xs">
                      Max {addOn.max_quantity}
                    </Badge>
                  )}
                </div>
                {addOn.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {addOn.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingId(addOn.id)}
                  aria-label="Edit add-on"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(addOn.id, addOn.name)}
                  aria-label="Delete add-on"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Inline create form */}
      {showCreateForm && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3">New Experience</h4>
          <AddOnForm
            action={boundCreateAction}
            submitLabel="Add Experience"
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Toggle create form */}
      {!showCreateForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      )}
    </div>
  )
}
