import { eq, useLiveQuery } from '@tanstack/react-db'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Button } from '~/components/ui/button'
import { CollectionContext, useCollections } from '~/lib/collection-context.client'
import { createHabitCollections } from '~/lib/collections.client'
import { cn } from '~/lib/utils'

export function clientLoader() {
	return {}
}

export function HydrateFallback() {
	return (
		<div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
	)
}

const COLORS = [
	'red',
	'orange',
	'amber',
	'green',
	'emerald',
	'cyan',
	'blue',
	'violet',
	'purple',
	'pink',
] as const

const COLOR_MAP: Record<string, { bg: string; border: string }> = {
	red: { bg: 'bg-red-500', border: 'border-red-300 dark:border-red-700' },
	orange: { bg: 'bg-orange-500', border: 'border-orange-300 dark:border-orange-700' },
	amber: { bg: 'bg-amber-500', border: 'border-amber-300 dark:border-amber-700' },
	green: { bg: 'bg-green-500', border: 'border-green-300 dark:border-green-700' },
	emerald: { bg: 'bg-emerald-500', border: 'border-emerald-300 dark:border-emerald-700' },
	cyan: { bg: 'bg-cyan-500', border: 'border-cyan-300 dark:border-cyan-700' },
	blue: { bg: 'bg-blue-500', border: 'border-blue-300 dark:border-blue-700' },
	violet: { bg: 'bg-violet-500', border: 'border-violet-300 dark:border-violet-700' },
	purple: { bg: 'bg-purple-500', border: 'border-purple-300 dark:border-purple-700' },
	pink: { bg: 'bg-pink-500', border: 'border-pink-300 dark:border-pink-700' },
}

const getDays = (count: number) => {
	const days: string[] = []
	const today = new Date()
	for (let i = count - 1; i >= 0; i--) {
		const d = new Date(today)
		d.setDate(d.getDate() - i)
		days.push(d.toISOString().slice(0, 10))
	}
	return days
}

const formatDay = (dateStr: string) => {
	const d = new Date(`${dateStr}T12:00:00`)
	return {
		weekday: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
		day: d.getDate(),
	}
}

const HabitGrid = () => {
	const { userId } = useOutletContext<{ userId: string }>()
	const { habitCollection, completionCollection } = useCollections()

	const { data: habits, isLoading: habitsLoading } = useLiveQuery((q) =>
		q
			.from({ habits: habitCollection })
			.where(({ habits }) => eq(habits.archived, false))
			.orderBy(({ habits }) => habits.position, 'asc'),
	)

	const { data: completions, isLoading: completionsLoading } = useLiveQuery((q) =>
		q.from({ completions: completionCollection }),
	)

	const days = useMemo(() => getDays(60), [])
	const today = days[days.length - 1]

	const completionSet = useMemo(() => {
		const set = new Set<string>()
		if (completions) {
			for (const c of completions) {
				set.add(`${c.habit_id}:${c.date}`)
			}
		}
		return set
	}, [completions])

	const completionLookup = useMemo(() => {
		const map = new Map<string, string>()
		if (completions) {
			for (const c of completions) {
				map.set(`${c.habit_id}:${c.date}`, c.id)
			}
		}
		return map
	}, [completions])

	const scrolledRef = useRef(false)
	const scrollRef = useCallback((node: HTMLDivElement | null) => {
		if (node && !scrolledRef.current) {
			node.scrollLeft = node.scrollWidth
			scrolledRef.current = true
		}
	}, [])

	const [showForm, setShowForm] = useState(false)
	const [newName, setNewName] = useState('')
	const [newColor, setNewColor] = useState<string>(COLORS[0])

	const handleAddHabit = () => {
		if (!newName.trim()) return
		habitCollection.insert({
			id: crypto.randomUUID(),
			user_id: userId,
			name: newName.trim(),
			color: newColor,
			archived: false,
			position: habits ? habits.length : 0,
			created_at: new Date(),
		})
		setNewName('')
		setNewColor(COLORS[0])
		setShowForm(false)
	}

	const handleDeleteHabit = (id: string) => {
		habitCollection.delete(id)
	}

	const handleToggle = (habitId: string, date: string) => {
		const key = `${habitId}:${date}`
		const existingId = completionLookup.get(key)
		if (existingId) {
			completionCollection.delete(existingId)
		} else {
			completionCollection.insert({
				id: crypto.randomUUID(),
				habit_id: habitId,
				user_id: userId,
				date,
				created_at: new Date(),
			})
		}
	}

	if (habitsLoading || completionsLoading) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
		)
	}

	return (
		<div>
			<div className="mb-4">
				{showForm ? (
					<div className="flex flex-wrap items-end gap-2">
						<input
							type="text"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
							placeholder="Habit name"
							className="h-8 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
						/>
						<div className="flex gap-1">
							{COLORS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setNewColor(c)}
									className={cn(
										'size-6 rounded-full transition-transform',
										COLOR_MAP[c].bg,
										newColor === c &&
											'scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-background',
									)}
								/>
							))}
						</div>
						<Button size="sm" onClick={handleAddHabit}>
							Add
						</Button>
						<Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
							Cancel
						</Button>
					</div>
				) : (
					<Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
						+ Add habit
					</Button>
				)}
			</div>

			<div ref={scrollRef} className="overflow-x-auto">
				<table className="border-collapse">
					<thead>
						<tr>
							<th className="sticky left-0 z-10 bg-background pr-4 text-left text-sm font-medium text-muted-foreground" />
							{days.map((date) => {
								const { weekday, day } = formatDay(date)
								const isToday = date === today
								return (
									<th
										key={date}
										className={cn(
											'px-0.5 pb-2 text-center text-xs font-normal text-muted-foreground',
											isToday && 'text-foreground font-medium',
										)}
									>
										<div>{weekday}</div>
										<div
											className={cn(
												'mx-auto flex size-6 items-center justify-center rounded-full text-[11px]',
												isToday && 'bg-foreground text-background',
											)}
										>
											{day}
										</div>
									</th>
								)
							})}
						</tr>
					</thead>
					<tbody>
						{habits?.map((h) => {
							const colors = COLOR_MAP[h.color] ?? COLOR_MAP.green
							return (
								<tr key={h.id} className="group/row">
									<td className="sticky left-0 z-10 bg-background py-1 pr-4">
										<div className="flex items-center gap-1.5">
											<span className="text-sm whitespace-nowrap">{h.name}</span>
											<button
												type="button"
												onClick={() => handleDeleteHabit(h.id)}
												className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-focus-within/row:opacity-100 group-hover/row:opacity-100"
												title="Delete habit"
											>
												<svg
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<title>Delete</title>
													<path d="M18 6 6 18M6 6l12 12" />
												</svg>
											</button>
										</div>
									</td>
									{days.map((date) => {
										const done = completionSet.has(`${h.id}:${date}`)
										const isToday = date === today
										return (
											<td key={date} className="px-0.5 py-1 text-center">
												<button
													type="button"
													onClick={() => handleToggle(h.id, date)}
													className={cn(
														'mx-auto flex size-7 items-center justify-center rounded-sm transition-colors',
														done
															? `${colors.bg} opacity-90 hover:opacity-100`
															: `border border-dashed ${colors.border} hover:border-solid`,
														isToday && !done && 'border-solid',
													)}
												/>
											</td>
										)
									})}
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>

			{habits?.length === 0 && (
				<p className="py-10 text-center text-muted-foreground">
					No habits yet. Add one to get started.
				</p>
			)}
		</div>
	)
}

export default function Dashboard() {
	const { userId } = useOutletContext<{ userId: string }>()
	const collections = useMemo(() => createHabitCollections(window.location.origin), [])

	return (
		<CollectionContext value={collections} key={userId}>
			<HabitGrid />
		</CollectionContext>
	)
}
