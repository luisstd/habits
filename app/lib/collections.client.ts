import {
	BrowserCollectionCoordinator,
	createBrowserWASQLitePersistence,
	openBrowserWASQLiteOPFSDatabase,
	persistedCollectionOptions,
} from '@tanstack/browser-db-sqlite-persistence'
import type { CollectionConfig } from '@tanstack/db'
import { createCollection } from '@tanstack/db'
import type { ElectricCollectionUtils } from '@tanstack/electric-db-collection'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { z } from 'zod'
import type { MutationPayload, MutationType } from '~/lib/schemas'

const habitSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	name: z.string(),
	color: z.string(),
	archived: z.boolean(),
	position: z.number(),
	created_at: z.date(),
})

const completionSchema = z.object({
	id: z.string(),
	habit_id: z.string(),
	user_id: z.string(),
	date: z.string(),
	created_at: z.date(),
})

type HabitRow = z.infer<typeof habitSchema>
type CompletionRow = z.infer<typeof completionSchema>
type CollectionKey = string | number
type HabitCollectionConfig = CollectionConfig<
	HabitRow,
	CollectionKey,
	typeof habitSchema,
	ElectricCollectionUtils<HabitRow>
> & { schema: typeof habitSchema }
type CompletionCollectionConfig = CollectionConfig<
	CompletionRow,
	CollectionKey,
	typeof completionSchema,
	ElectricCollectionUtils<CompletionRow>
> & { schema: typeof completionSchema }

function requireSchema<TConfig extends { schema?: unknown }>(config: TConfig) {
	// TanStack's persistedCollectionOptions currently widens schema to optional,
	// but createCollection's schema-aware overload requires it to be present.
	return config as TConfig & { schema: Exclude<TConfig['schema'], undefined> }
}

const syncMutation = async <T extends MutationType>(
	type: T,
	data: MutationPayload[T],
): Promise<{ txid: number }> => {
	const res = await fetch('/api/sync', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ type, data }),
	})
	if (!res.ok) {
		const body = await res.json().catch(() => ({}))
		throw new Error(body.error ?? `Sync failed: ${res.status}`)
	}
	return res.json()
}

export const createHabit = (data: MutationPayload['createHabit']) =>
	syncMutation('createHabit', data)

export const updateHabit = (data: MutationPayload['updateHabit']) =>
	syncMutation('updateHabit', data)

export const deleteHabit = (data: MutationPayload['deleteHabit']) =>
	syncMutation('deleteHabit', data)

export const upsertCompletion = (data: MutationPayload['upsertCompletion']) =>
	syncMutation('upsertCompletion', data)

export const deleteCompletion = (data: MutationPayload['deleteCompletion']) =>
	syncMutation('deleteCompletion', data)

export type HabitCollection = Awaited<ReturnType<typeof createHabitCollections>>['habitCollection']
export type CompletionCollection = Awaited<
	ReturnType<typeof createHabitCollections>
>['completionCollection']

export const createHabitCollections = async (baseUrl: string) => {
	const db = await openBrowserWASQLiteOPFSDatabase({ databaseName: 'habits.sqlite' })
	const coordinator = new BrowserCollectionCoordinator({ dbName: 'habits' })

	const habitPersistence = createBrowserWASQLitePersistence<HabitRow, string | number>({
		database: db,
		coordinator,
	})

	const completionPersistence = createBrowserWASQLitePersistence<CompletionRow, string | number>({
		database: db,
		coordinator,
	})

	const habitCollectionOptions = requireSchema(
		persistedCollectionOptions({
			persistence: habitPersistence,
			schemaVersion: 1,
			...electricCollectionOptions({
				id: 'habits',
				schema: habitSchema,
				getKey: (habit) => habit.id,
				shapeOptions: {
					url: `${baseUrl}/api/shapes/habits`,
					parser: {
						timestamptz: (value: string) => new Date(value),
					},
				},
				onInsert: async ({ transaction }) => {
					const row = transaction.mutations[0].modified
					const { txid } = await createHabit(row)
					return { txid }
				},
				onUpdate: async ({ transaction }) => {
					const { original, changes } = transaction.mutations[0]
					const { txid } = await updateHabit({ id: original.id, ...changes })
					return { txid }
				},
				onDelete: async ({ transaction }) => {
					const row = transaction.mutations[0].original
					const { txid } = await deleteHabit(row)
					return { txid }
				},
			}),
		}),
	) satisfies HabitCollectionConfig

	const habitCollection = createCollection(habitCollectionOptions)

	const completionCollectionOptions = requireSchema(
		persistedCollectionOptions({
			persistence: completionPersistence,
			schemaVersion: 1,
			...electricCollectionOptions({
				id: 'completions',
				schema: completionSchema,
				getKey: (completion) => completion.id,
				shapeOptions: {
					url: `${baseUrl}/api/shapes/completions`,
					parser: {
						timestamptz: (value: string) => new Date(value),
					},
				},
				onInsert: async ({ transaction }) => {
					const row = transaction.mutations[0].modified
					const { txid } = await upsertCompletion(row)
					return { txid }
				},
				onDelete: async ({ transaction }) => {
					const row = transaction.mutations[0].original
					const { txid } = await deleteCompletion(row)
					return { txid }
				},
			}),
		}),
	) satisfies CompletionCollectionConfig

	const completionCollection = createCollection(completionCollectionOptions)

	return {
		habitCollection,
		completionCollection,
		close: async () => {
			coordinator.dispose()
			await db.close?.()
		},
	}
}
