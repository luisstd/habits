import { z } from 'zod'

export const createHabitSchema = z.object({
	id: z.uuid(),
	name: z.string().min(1),
	color: z.string().min(1),
	archived: z.boolean().optional().default(false),
	position: z.number().int().min(0),
})

export const updateHabitSchema = z.object({
	id: z.uuid(),
	name: z.string().min(1).optional(),
	color: z.string().min(1).optional(),
	position: z.number().int().min(0).optional(),
	archived: z.boolean().optional(),
})

export const deleteHabitSchema = z.object({
	id: z.uuid(),
})

export const upsertCompletionSchema = z.object({
	id: z.string().min(1),
	habit_id: z.uuid(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const deleteCompletionSchema = z.object({
	id: z.string().min(1),
})

export const mutations = {
	createHabit: createHabitSchema,
	updateHabit: updateHabitSchema,
	deleteHabit: deleteHabitSchema,
	upsertCompletion: upsertCompletionSchema,
	deleteCompletion: deleteCompletionSchema,
} as const

export const syncMutationRequestSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('createHabit'), data: createHabitSchema }),
	z.object({ type: z.literal('updateHabit'), data: updateHabitSchema }),
	z.object({ type: z.literal('deleteHabit'), data: deleteHabitSchema }),
	z.object({ type: z.literal('upsertCompletion'), data: upsertCompletionSchema }),
	z.object({ type: z.literal('deleteCompletion'), data: deleteCompletionSchema }),
])

export type MutationType = keyof typeof mutations
export type MutationPayload = {
	[K in MutationType]: z.input<(typeof mutations)[K]>
}
export type SyncMutationRequest = z.infer<typeof syncMutationRequestSchema>
