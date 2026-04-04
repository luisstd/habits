import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { CollectionContext, useCollections } from '~/lib/collection-context.client'
import { createHabitCollections } from '~/lib/collections.client'
import { formatDateRange, formatDay, getDays, getToday } from '~/lib/dates'
import { computeReorder } from '~/lib/reorder'
import { useResponsiveDayCount } from '~/lib/use-responsive-day-count'
import { cn } from '~/lib/utils'
import type { Route } from './+types/dashboard'

export const meta: Route.MetaFunction = () => [{ title: 'habits' }]

export function clientLoader() {
	return {}
}

export function HydrateFallback() {
	return (
		<div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
	)
}

const HABIT_COLORS = ['coral', 'amber', 'sage', 'ocean', 'iris', 'rose'] as const
type HabitColor = (typeof HABIT_COLORS)[number]

function habitColorVar(color: string) {
	const resolved = HABIT_COLORS.includes(color as HabitColor) ? color : 'coral'
	return `var(--habit-${resolved})`
}

const AddHabitDialog = ({
	open,
	onOpenChange,
	onAdd,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onAdd: (name: string, color: HabitColor) => void
}) => {
	const [name, setName] = useState('')
	const [color, setColor] = useState<HabitColor>('coral')

	const handleSubmit = () => {
		if (!name.trim()) return
		onAdd(name.trim(), color)
		setName('')
		setColor('coral')
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>add habit</DialogTitle>
				</DialogHeader>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
					placeholder="habit name"
					className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring"
					autoFocus
				/>
				<div className="flex gap-2">
					{HABIT_COLORS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => setColor(c)}
							className={cn(
								'size-8 rounded-full transition-transform',
								color === c &&
									'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background',
							)}
							style={{ backgroundColor: `var(--habit-${c})` }}
						/>
					))}
				</div>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" size="sm" />}>cancel</DialogClose>
					<Button size="sm" onClick={handleSubmit}>
						add
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

const HabitRow = ({
	habit,
	days,
	today,
	completionSet,
	onToggle,
	onDelete,
	index,
	gridCols,
}: {
	habit: { id: string; name: string; color: string; position: number }
	days: string[]
	today: string
	completionSet: Set<string>
	onToggle: (habitId: string, date: string) => void
	onDelete: (id: string) => void
	index: number
	gridCols: string
}) => {
	const { ref, handleRef, isDragSource } = useSortable({
		id: habit.id,
		index,
		group: 'habits',
	})

	const bgVar = habitColorVar(habit.color)

	return (
		<div
			ref={ref}
			className={cn('grid items-center', isDragSource && 'opacity-50')}
			style={{ gridTemplateColumns: gridCols }}
		>
			{/* Name cell */}
			<div className="group/row flex items-center gap-1 pr-3">
				<button
					type="button"
					ref={handleRef}
					className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 active:cursor-grabbing"
					tabIndex={-1}
				>
					<GripVertical className="size-4" />
				</button>
				<span className="truncate text-sm max-w-25 md:max-w-40">{habit.name}</span>
				<button
					type="button"
					onClick={() => onDelete(habit.id)}
					className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-focus-within/row:opacity-100 group-hover/row:opacity-100"
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

			{/* Day cells */}
			{days.map((date) => {
				const done = completionSet.has(`${habit.id}:${date}`)
				const isToday = date === today
				return (
					<div key={date} className="flex items-center justify-center">
						<button
							type="button"
							onClick={() => onToggle(habit.id, date)}
							className={cn(
								'size-10 md:size-11 rounded-sm transition-colors',
								isToday && 'ring-1 ring-foreground/10',
								done
									? 'opacity-90 hover:opacity-100'
									: isToday
										? 'border-2 border-current opacity-20 hover:opacity-30'
										: 'border border-dashed border-current opacity-15 hover:opacity-25',
							)}
							style={done ? { backgroundColor: bgVar } : { color: bgVar }}
						/>
					</div>
				)
			})}
		</div>
	)
}

const HabitGrid = () => {
	const { userId } = useOutletContext<{ userId: string }>()
	const { habitCollection, completionCollection } = useCollections()
	const { dayCount, cellRem } = useResponsiveDayCount()
	const gridCols = `auto repeat(${dayCount}, ${cellRem})`

	const { data: habits, isLoading: habitsLoading } = useLiveQuery((q) =>
		q
			.from({ habits: habitCollection })
			.where(({ habits }) => eq(habits.archived, false))
			.orderBy(({ habits }) => habits.position, 'asc'),
	)

	const { data: completions, isLoading: completionsLoading } = useLiveQuery((q) =>
		q.from({ completions: completionCollection }),
	)

	const [offset, setOffset] = useState(0)
	const days = useMemo(() => getDays(dayCount, offset), [dayCount, offset])
	const today = getToday()

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

	const [dialogOpen, setDialogOpen] = useState(false)

	const handleAddHabit = useCallback(
		(name: string, color: HabitColor) => {
			habitCollection.insert({
				id: crypto.randomUUID(),
				user_id: userId,
				name,
				color,
				archived: false,
				position: habits ? habits.length : 0,
				created_at: new Date(),
			})
			setDialogOpen(false)
		},
		[habitCollection, userId, habits],
	)

	const handleDeleteHabit = useCallback(
		(id: string) => {
			habitCollection.delete(id)
		},
		[habitCollection],
	)

	const handleToggle = useCallback(
		(habitId: string, date: string) => {
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
		},
		[completionLookup, completionCollection, userId],
	)

	const handleDragEnd = useCallback(
		(event: {
			operation: { source: { id: unknown } | null; target: { id: unknown } | null }
			canceled: boolean
		}) => {
			if (event.canceled || !habits) return
			const { source, target } = event.operation
			if (!source || !target) return

			const updates = computeReorder(
				habits.map((h) => h.id),
				String(source.id),
				String(target.id),
			)
			if (!updates) return

			for (const { id, position } of updates) {
				habitCollection.update(id, (draft) => {
					draft.position = position
				})
			}
		},
		[habits, habitCollection],
	)

	if (habitsLoading || completionsLoading) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
		)
	}

	return (
		<div className="overflow-hidden">
			{/* Toolbar */}
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setOffset((o) => o + dayCount)}
						className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<ChevronLeft className="size-4" />
					</button>
					<span className="min-w-30 text-center text-sm text-muted-foreground">
						{formatDateRange(days)}
					</span>
					<button
						type="button"
						onClick={() => setOffset((o) => Math.max(0, o - dayCount))}
						disabled={offset === 0}
						className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
					>
						<ChevronRight className="size-4" />
					</button>
					{offset > 0 && (
						<button
							type="button"
							onClick={() => setOffset(0)}
							className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
						>
							today
						</button>
					)}
				</div>
				<Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
					+ add habit
				</Button>
			</div>

			{/* Header row */}
			<div className="grid items-center" style={{ gridTemplateColumns: gridCols }}>
				<div />
				{days.map((date) => {
					const { weekday, day } = formatDay(date)
					const isToday = date === today
					return (
						<div
							key={date}
							className={cn(
								'flex flex-col items-center pb-2 text-xs text-muted-foreground',
								isToday && 'text-foreground font-medium',
							)}
						>
							<span>{weekday}</span>
							<span
								className={cn(
									'flex size-6 items-center justify-center rounded-full text-[11px]',
									isToday && 'bg-foreground text-background',
								)}
							>
								{day}
							</span>
						</div>
					)
				})}
			</div>

			{/* Habit rows */}
			<DragDropProvider onDragEnd={handleDragEnd}>
				<div className="flex flex-col gap-y-1">
					{habits?.map((h, index) => (
						<HabitRow
							key={h.id}
							habit={h}
							days={days}
							today={today}
							completionSet={completionSet}
							onToggle={handleToggle}
							onDelete={handleDeleteHabit}
							index={index}
							gridCols={gridCols}
						/>
					))}
				</div>
			</DragDropProvider>

			{habits?.length === 0 && (
				<p className="py-10 text-center text-muted-foreground">
					no habits yet. add one to get started.
				</p>
			)}

			<AddHabitDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={handleAddHabit} />
		</div>
	)
}

export default function Dashboard() {
	const { userId } = useOutletContext<{ userId: string }>()
	const [collections, setCollections] = useState<Awaited<
		ReturnType<typeof createHabitCollections>
	> | null>(null)
	const closeRef = useRef<(() => Promise<void>) | null>(null)

	useEffect(() => {
		let cancelled = false
		createHabitCollections(window.location.origin).then((c) => {
			if (cancelled) {
				c.close()
				return
			}
			closeRef.current = c.close
			setCollections(c)
		})
		return () => {
			cancelled = true
			closeRef.current?.()
		}
	}, [])

	if (!collections) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
		)
	}

	return (
		<CollectionContext value={collections} key={userId}>
			<HabitGrid />
		</CollectionContext>
	)
}
