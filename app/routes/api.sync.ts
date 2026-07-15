import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '~/.server/auth'
import { db } from '~/.server/db/index'
import { habit, habitCompletion } from '~/.server/db/schema'
import { syncMutationRequestSchema } from '~/lib/schemas'
import type { Route } from './+types/api.sync'

// A mutation the client must not retry (bad input, unowned rows). Everything
// else is returned as a 500 so the client's retry logic can kick in —
// mapping transient faults (e.g. a database blip) to 4xx would permanently
// roll back a write the user made.
class MutationRejectedError extends Error {}

export const action = async ({ request }: Route.ActionArgs) => {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const mutation = syncMutationRequestSchema.parse(await request.json())
		const { type } = mutation
		const userId = session.user.id

		const { txid, noop } = await db.transaction(async (tx) => {
			let noop = false
			switch (type) {
				case 'createHabit': {
					const data = mutation.data
					// Upsert so a retried create (response lost after commit)
					// stays idempotent; touching the row also emits a fresh
					// txid for the client to await. setWhere stops a request
					// carrying another user's habit id from overwriting it.
					await tx
						.insert(habit)
						.values({
							id: data.id,
							userId,
							name: data.name,
							color: data.color,
							archived: data.archived,
							position: data.position,
						})
						.onConflictDoUpdate({
							target: habit.id,
							set: {
								name: data.name,
								color: data.color,
								archived: data.archived,
								position: data.position,
							},
							setWhere: sql`${habit.userId} = ${userId}`,
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
						throw new MutationRejectedError('No fields to update')
					}
					const updated = await tx
						.update(habit)
						.set(updates)
						.where(and(eq(habit.id, id), eq(habit.userId, userId)))
						.returning({ id: habit.id })
					if (updated.length === 0) {
						throw new MutationRejectedError('Not found or not owned')
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
						throw new MutationRejectedError('Not found or not owned')
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
						throw new MutationRejectedError('Habit not found or not owned')
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
					const deleted = await tx
						.delete(habitCompletion)
						.where(and(eq(habitCompletion.id, data.id), eq(habitCompletion.userId, userId)))
						.returning({ id: habitCompletion.id })
					// A delete that matched nothing writes no row, so its txid
					// never appears in the shape stream — flag it so the client
					// doesn't await a confirmation that cannot arrive.
					noop = deleted.length === 0
					break
				}

				default: {
					const _exhaustive: never = type
					throw new MutationRejectedError(`Unknown mutation type: ${_exhaustive}`)
				}
			}

			const result = await tx.execute<{ txid: string }>(
				sql`SELECT pg_current_xact_id()::text AS txid`,
			)
			return { txid: Number(result.rows[0].txid), noop }
		})

		return Response.json(noop ? { txid, noop } : { txid })
	} catch (err) {
		if (
			err instanceof MutationRejectedError ||
			err instanceof z.ZodError ||
			err instanceof SyntaxError
		) {
			const message =
				err instanceof MutationRejectedError ? err.message : 'Invalid mutation payload'
			return Response.json({ error: message }, { status: 400 })
		}
		const message = err instanceof Error ? err.message : 'Unknown error'
		return Response.json({ error: message }, { status: 500 })
	}
}
