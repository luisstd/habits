import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '~/.server/auth'
import { db } from '~/.server/db/index'
import { habit, habitCompletion } from '~/.server/db/schema'
import type { Route } from './+types/api.sync'

const createHabitSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	color: z.string().min(1),
	archived: z.boolean().optional().default(false),
	position: z.number().int().min(0),
})

const updateHabitSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).optional(),
	color: z.string().min(1).optional(),
	position: z.number().int().min(0).optional(),
	archived: z.boolean().optional(),
})

const deleteHabitSchema = z.object({
	id: z.string().uuid(),
})

const upsertCompletionSchema = z.object({
	id: z.string().uuid(),
	habit_id: z.string().uuid(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const deleteCompletionSchema = z.object({
	id: z.string().uuid(),
})

export const action = async ({ request }: Route.ActionArgs) => {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = await request.json()
	const type = body.type
	const userId = session.user.id

	try {
		const txid = await db.transaction(async (tx) => {
			switch (type) {
				case 'createHabit': {
					const data = createHabitSchema.parse(body.data)
					await tx.insert(habit).values({
						id: data.id,
						userId,
						name: data.name,
						color: data.color,
						archived: data.archived,
						position: data.position,
					})
					break
				}

				case 'updateHabit': {
					const data = updateHabitSchema.parse(body.data)
					const { id, ...fields } = data
					const updates: Record<string, unknown> = {}
					if (fields.name !== undefined) updates.name = fields.name
					if (fields.color !== undefined) updates.color = fields.color
					if (fields.position !== undefined) updates.position = fields.position
					if (fields.archived !== undefined) updates.archived = fields.archived
					if (Object.keys(updates).length === 0) {
						throw new Error('No fields to update')
					}
					const updated = await tx
						.update(habit)
						.set(updates)
						.where(and(eq(habit.id, id), eq(habit.userId, userId)))
						.returning({ id: habit.id })
					if (updated.length === 0) {
						throw new Error('Not found or not owned')
					}
					break
				}

				case 'deleteHabit': {
					const data = deleteHabitSchema.parse(body.data)
					const deleted = await tx
						.delete(habit)
						.where(and(eq(habit.id, data.id), eq(habit.userId, userId)))
						.returning({ id: habit.id })
					if (deleted.length === 0) {
						throw new Error('Not found or not owned')
					}
					break
				}

				case 'upsertCompletion': {
					const data = upsertCompletionSchema.parse(body.data)
					const [ownsHabit] = await tx
						.select({ id: habit.id })
						.from(habit)
						.where(and(eq(habit.id, data.habit_id), eq(habit.userId, userId)))
					if (!ownsHabit) {
						throw new Error('Habit not found or not owned')
					}
					await tx
						.insert(habitCompletion)
						.values({
							id: data.id,
							habitId: data.habit_id,
							userId,
							date: data.date,
						})
						.onConflictDoNothing()
					break
				}

				case 'deleteCompletion': {
					const data = deleteCompletionSchema.parse(body.data)
					await tx
						.delete(habitCompletion)
						.where(and(eq(habitCompletion.id, data.id), eq(habitCompletion.userId, userId)))
					break
				}

				default:
					throw new Error(`Unknown mutation type: ${type}`)
			}

			const result = await tx.execute<{ txid: string }>(
				sql`SELECT pg_current_xact_id()::text AS txid`,
			)
			return Number(result.rows[0].txid)
		})

		return Response.json({ txid })
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		return Response.json({ error: message }, { status: 400 })
	}
}
