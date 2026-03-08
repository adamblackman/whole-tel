'use client'

import { DragDropProvider } from '@dnd-kit/react'
import type { ReactNode } from 'react'

interface DndProviderProps {
  children: ReactNode
  onDragEnd?: (event: { operation: { source: { id: string | number } | null; target: { id: string | number } | null } }) => void
}

/**
 * "use client" wrapper for @dnd-kit/react DragDropProvider.
 * Exists to work around @dnd-kit/react issue #1654 — the library
 * does not include the "use client" directive, so DragDropProvider
 * fails when imported in server-rendered contexts.
 */
export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <DragDropProvider onDragEnd={onDragEnd as any}>
      {children}
    </DragDropProvider>
  )
}
