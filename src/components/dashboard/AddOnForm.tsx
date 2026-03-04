'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ActionState } from '@/lib/validations/property'

interface AddOnFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  initialData?: {
    name?: string
    description?: string | null
    price?: number
    pricing_unit?: 'per_person' | 'per_booking'
    max_quantity?: number | null
  }
  submitLabel?: string
  onCancel?: () => void
}

export function AddOnForm({ action, initialData, submitLabel, onCancel }: AddOnFormProps) {
  const [state, formAction, pending] = useActionState(action, {})

  // Close edit mode on successful save
  useEffect(() => {
    if (state.message?.includes('successfully') && onCancel) {
      onCancel()
    }
  }, [state.message, onCancel])

  return (
    <form action={formAction} className="space-y-4">
      {state.message && !state.message.includes('successfully') && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="addon-name">Name</Label>
        <Input
          id="addon-name"
          name="name"
          defaultValue={initialData?.name}
          placeholder="Private chef dinner"
          required
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="addon-description">Description (optional)</Label>
        <Textarea
          id="addon-description"
          name="description"
          rows={2}
          defaultValue={initialData?.description ?? ''}
          placeholder="Describe this experience..."
        />
        {state.errors?.description && (
          <p className="text-sm text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Price */}
        <div className="space-y-1.5">
          <Label htmlFor="addon-price">Price ($)</Label>
          <Input
            id="addon-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.price ?? ''}
            required
          />
          {state.errors?.price && (
            <p className="text-sm text-destructive">{state.errors.price[0]}</p>
          )}
        </div>

        {/* Pricing Unit */}
        <div className="space-y-1.5">
          <Label htmlFor="addon-pricing-unit">Pricing</Label>
          <Select name="pricing_unit" defaultValue={initialData?.pricing_unit ?? 'per_booking'}>
            <SelectTrigger id="addon-pricing-unit">
              <SelectValue placeholder="Select pricing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_booking">Per Booking</SelectItem>
              <SelectItem value="per_person">Per Person</SelectItem>
            </SelectContent>
          </Select>
          {state.errors?.pricing_unit && (
            <p className="text-sm text-destructive">{state.errors.pricing_unit[0]}</p>
          )}
        </div>

        {/* Max Quantity */}
        <div className="space-y-1.5">
          <Label htmlFor="addon-max-quantity">Max Quantity (optional)</Label>
          <Input
            id="addon-max-quantity"
            name="max_quantity"
            type="number"
            min="1"
            defaultValue={initialData?.max_quantity ?? ''}
            placeholder="Leave empty for unlimited"
          />
          {state.errors?.max_quantity && (
            <p className="text-sm text-destructive">{state.errors.max_quantity[0]}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving...' : (submitLabel ?? 'Add Experience')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
