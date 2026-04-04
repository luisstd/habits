import { createCollection } from '@tanstack/db'
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

export type HabitCollection = ReturnType<typeof createHabitCollections>['habitCollection']
export type CompletionCollection = ReturnType<typeof createHabitCollections>['completionCollection']

export const createHabitCollections = (baseUrl: string) => {
	const habitCollection = createCollection({
		...electricCollectionOptions({
			id: 'habits',
			schema: habitSchema,
			getKey: (h) => h.id,
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
	})

	const completionCollection = createCollection({
		...electricCollectionOptions({
			id: 'completions',
			schema: completionSchema,
			getKey: (c) => c.id,
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
	})

	return { habitCollection, completionCollection }
}
