'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

const DESTINATIONS = [
  { label: 'All', value: '' },
  { label: 'Cabo', value: 'Cabo San Lucas' },
  { label: 'Puerto Vallarta', value: 'Puerto Vallarta' },
]

interface DestinationFilterProps {
  currentDestination?: string
}

export function DestinationFilter({ currentDestination }: DestinationFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelect = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('destination', value)
      } else {
        params.delete('destination')
      }
      const query = params.toString()
      router.push(pathname + (query ? '?' + query : ''))
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex gap-2 flex-wrap">
      {DESTINATIONS.map((dest) => {
        const isActive = (dest.value === '' && !currentDestination) || dest.value === currentDestination
        return (
          <Button
            key={dest.value || 'all'}
            variant={isActive ? 'default' : 'outline'}
            className={isActive ? 'bg-brand-teal text-white hover:bg-brand-teal/90' : ''}
            onClick={() => handleSelect(dest.value)}
          >
            {dest.label}
          </Button>
        )
      })}
    </div>
  )
}
