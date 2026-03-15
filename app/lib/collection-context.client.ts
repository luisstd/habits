import { createContext, useContext } from 'react'
import type { CompletionCollection, HabitCollection } from './collections.client'

type CollectionContextValue = {
	habitCollection: HabitCollection
	completionCollection: CompletionCollection
}

export const CollectionContext = createContext<CollectionContextValue | null>(null)

export const useCollections = () => {
	const ctx = useContext(CollectionContext)
	if (!ctx) throw new Error('useCollections must be used within CollectionProvider')
	return ctx
}
