import { and, eq, sql } from 'drizzle-orm'
import { auth } from '~/.server/auth'
import { db } from '~/.server/db/index'
import { habit, habitCompletion } from '~/.server/db/schema'
import { syncMutationRequestSchema } from '~/lib/schemas'
import type { Route } from './+types/api.sync'

export const action = async ({ request }: Route.ActionArgs) => {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const mutation = syncMutationRequestSchema.parse(await request.json())
	const { type } = mutation
	const userId = session.user.id

	try {
		const txid = await db.transaction(async (tx) => {
			switch (type) {
				case 'createHabit': {
					const data = mutation.data
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
					const data = mutation.data
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
					const data = mutation.data
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
					const data = mutation.data
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
						// Touch the row (not DO NOTHING) so the write emits a txid; the
						// client's awaitTxId rolls back the optimistic update without one.
						.onConflictDoUpdate({
							target: [habitCompletion.habitId, habitCompletion.date],
							set: { date: data.date },
						})
					break
				}

				case 'deleteCompletion': {
					const data = mutation.data
					await tx
						.delete(habitCompletion)
						.where(and(eq(habitCompletion.id, data.id), eq(habitCompletion.userId, userId)))
					break
				}

				default: {
					const _exhaustive: never = type
					throw new Error(`Unknown mutation type: ${_exhaustive}`)
				}
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
