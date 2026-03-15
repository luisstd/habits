import { auth } from '~/.server/auth'
import { db } from '~/.server/db/index'
import { habit, habitCompletion } from '~/.server/db/schema'
import type { Route } from './+types/api.import'

type EverydayHabit = {
	name: string
	color: string
	archived: boolean | null
	dates: Record<string, { isMarked: boolean }>
}

type EverydayData = {
	habits: EverydayHabit[]
}

export const action = async ({ request }: Route.ActionArgs) => {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const data: EverydayData = await request.json()
	const userId = session.user.id

	let habitCount = 0
	let completionCount = 0

	for (const [index, h] of data.habits.entries()) {
		const habitId = crypto.randomUUID()
		await db.insert(habit).values({
			id: habitId,
			userId,
			name: h.name,
			color: h.color ?? 'green',
			archived: h.archived ?? false,
			position: index,
		})
		habitCount++

		const completionRows = Object.entries(h.dates)
			.filter(([_, v]) => v.isMarked)
			.map(([date]) => ({
				id: crypto.randomUUID(),
				habitId,
				userId,
				date,
			}))

		if (completionRows.length > 0) {
			const batchSize = 500
			for (let i = 0; i < completionRows.length; i += batchSize) {
				await db.insert(habitCompletion).values(completionRows.slice(i, i + batchSize))
			}
			completionCount += completionRows.length
		}
	}

	return Response.json({ habits: habitCount, completions: completionCount })
}
