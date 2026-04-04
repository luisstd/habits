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
import { Skeleton } from '~/components/ui/skeleton'
import { CollectionContext, useCollections } from '~/lib/collection-context.client'
import { formatDateRange, formatDay, getDays, getToday } from '~/lib/dates'
import { computeReorder } from '~/lib/reorder'
import {
	DASHBOARD_MAX_DAYS,
	dashboardGridColsClassName,
	dashboardVisibleRanges,
	getResponsiveDayCount,
	getResponsiveDayVisibilityClass,
} from '~/lib/use-responsive-day-count'
import { cn } from '~/lib/utils'
import type { Route } from './+types/dashboard'

type HabitCollections = Awaited<
	ReturnType<typeof import('~/lib/collections.client')['createHabitCollections']>
>

export const meta: Route.MetaFunction = () => [{ title: 'habits' }]

export function clientLoader() {
	return {}
}

clientLoader.hydrate = true as const

export function HydrateFallback() {
	return <DashboardSkeleton />
}

const HABIT_COLORS = ['coral', 'amber', 'sage', 'ocean', 'iris', 'rose'] as const
const SKELETON_NAME_WIDTHS = ['w-14', 'w-18', 'w-16', 'w-20', 'w-15', 'w-22'] as const
const DASHBOARD_SKELETON_ROWS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5', 'row-6'] as const

type HabitColor = (typeof HABIT_COLORS)[number]
type HabitRowData = { id: string; name: string; color: string; position: number }
type CompletionRowData = { id: string; habit_id: string; date: string }

function toHabitRowData(value: unknown): HabitRowData | null {
	if (typeof value !== 'object' || value === null) return null

	const row = value as Record<string, unknown>
	if (
		typeof row.id !== 'string' ||
		typeof row.name !== 'string' ||
		typeof row.color !== 'string' ||
		typeof row.position !== 'number'
	) {
		return null
	}

	return {
		id: row.id,
		name: row.name,
		color: row.color,
		position: row.position,
	}
}

function toCompletionRowData(value: unknown): CompletionRowData | null {
	if (typeof value !== 'object' || value === null) return null

	const row = value as Record<string, unknown>
	if (
		typeof row.id !== 'string' ||
		typeof row.habit_id !== 'string' ||
		typeof row.date !== 'string'
	) {
		return null
	}

	return {
		id: row.id,
		habit_id: row.habit_id,
		date: row.date,
	}
}

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

function DashboardToolbar({
	days,
	offset,
	onOlder,
	onNewer,
	onReset,
	onAddHabit,
	skeleton = false,
}: {
	days: string[]
	offset: number
	onOlder?: () => void
	onNewer?: () => void
	onReset?: () => void
	onAddHabit?: () => void
	skeleton?: boolean
}) {
	return (
		<div className="mb-4 flex items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-2">
				<button
					type="button"
					onClick={onOlder}
					disabled={skeleton}
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none"
				>
					<ChevronLeft className="size-4" />
				</button>
				<div className="min-w-30 text-center text-sm text-muted-foreground">
					{dashboardVisibleRanges.map((range) => (
						<span key={range.count} className={range.className}>
							{formatDateRange(days.slice(-range.count))}
						</span>
					))}
				</div>
				<button
					type="button"
					onClick={onNewer}
					disabled={skeleton || offset === 0}
					className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
				>
					<ChevronRight className="size-4" />
				</button>
				{offset > 0 && (
					<button
						type="button"
						onClick={onReset}
						className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
					>
						today
					</button>
				)}
			</div>
			<div className="shrink-0">
				<Button size="sm" variant="outline" onClick={onAddHabit} disabled={skeleton}>
					+ add habit
				</Button>
			</div>
		</div>
	)
}

function DashboardHeader({ days, today }: { days: string[]; today: string }) {
	return (
		<div className={cn('grid items-center gap-x-0.5', dashboardGridColsClassName)}>
			<div />
			{days.map((date, index) => {
				const { weekday, day } = formatDay(date)
				const isToday = date === today

				return (
					<div
						key={date}
						className={cn(
							'flex flex-col items-center pb-2 text-xs text-muted-foreground',
							getResponsiveDayVisibilityClass(index),
							isToday && 'font-medium text-foreground',
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
	)
}

function DeleteHabitIcon() {
	return (
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
}: {
	habit: HabitRowData
	days: string[]
	today: string
	completionSet: Set<string>
	onToggle: (habitId: string, date: string) => void
	onDelete: (id: string) => void
	index: number
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
			className={cn(
				'grid items-center gap-x-0.5',
				dashboardGridColsClassName,
				isDragSource && 'opacity-50',
			)}
		>
			<div className="group/row flex min-w-0 items-center gap-1 pr-3">
				<button
					type="button"
					ref={handleRef}
					className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 active:cursor-grabbing"
					tabIndex={-1}
				>
					<GripVertical className="size-4" />
				</button>
				<span className="max-w-25 truncate text-sm md:max-w-40">{habit.name}</span>
				<button
					type="button"
					onClick={() => onDelete(habit.id)}
					className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-focus-within/row:opacity-100 group-hover/row:opacity-100"
					title="Delete habit"
				>
					<DeleteHabitIcon />
				</button>
			</div>

			{days.map((date, dayIndex) => {
				const done = completionSet.has(`${habit.id}:${date}`)
				const isToday = date === today

				return (
					<div
						key={date}
						className={cn(
							'flex items-center justify-center',
							getResponsiveDayVisibilityClass(dayIndex),
						)}
					>
						<button
							type="button"
							onClick={() => onToggle(habit.id, date)}
							className={cn(
								'size-10 rounded-sm transition-colors md:size-11',
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

function HabitRowSkeleton({
	rowIndex,
	days,
	today,
	habitName,
}: {
	rowIndex: number
	days: string[]
	today: string
	habitName?: string
}) {
	return (
		<div className={cn('grid items-center gap-x-0.5', dashboardGridColsClassName)}>
			<div className="flex min-w-0 items-center gap-1 pr-3">
				<div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground/45">
					<GripVertical className="size-4" />
				</div>
				{habitName ? (
					<span className="max-w-25 truncate text-sm md:max-w-40">{habitName}</span>
				) : (
					<Skeleton
						className={cn(
							'h-3.5 rounded-sm border border-border/45 bg-muted/55 dark:border-border/55 dark:bg-muted/32',
							SKELETON_NAME_WIDTHS[rowIndex % SKELETON_NAME_WIDTHS.length],
						)}
					/>
				)}
				<div className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground/0">
					<DeleteHabitIcon />
				</div>
			</div>

			{days.map((date, index) => (
				<div
					key={date}
					className={cn('flex items-center justify-center', getResponsiveDayVisibilityClass(index))}
				>
					<Skeleton
						className={cn(
							'size-10 rounded-sm border border-border/45 bg-muted/48 md:size-11 dark:border-border/55 dark:bg-muted/26',
							date === today &&
								'border-foreground/14 bg-foreground/6 dark:border-foreground/18 dark:bg-foreground/7',
						)}
					/>
				</div>
			))}
		</div>
	)
}

function DashboardSkeleton({ offset = 0, habitNames }: { offset?: number; habitNames?: string[] }) {
	const days = useMemo(() => getDays(DASHBOARD_MAX_DAYS, offset), [offset])
	const today = getToday()
	const rows = habitNames?.length ? habitNames : DASHBOARD_SKELETON_ROWS

	return (
		<div className="overflow-hidden">
			<DashboardToolbar days={days} offset={offset} skeleton />
			<DashboardHeader days={days} today={today} />
			<div className="flex flex-col gap-y-1">
				{rows.map((rowValue, rowIndex) => (
					<HabitRowSkeleton
						key={rowValue}
						rowIndex={rowIndex}
						days={days}
						today={today}
						habitName={habitNames?.[rowIndex]}
					/>
				))}
			</div>
		</div>
	)
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

	const [offset, setOffset] = useState(0)
	const days = useMemo(() => getDays(DASHBOARD_MAX_DAYS, offset), [offset])
	const today = getToday()
	const normalizedHabits = useMemo(
		() =>
			(habits ?? []).map(toHabitRowData).filter((habit): habit is HabitRowData => habit !== null),
		[habits],
	)
	const normalizedCompletions = useMemo(
		() =>
			(completions ?? [])
				.map(toCompletionRowData)
				.filter((completion): completion is CompletionRowData => completion !== null),
		[completions],
	)

	const completionSet = useMemo(() => {
		const set = new Set<string>()
		for (const c of normalizedCompletions) {
			set.add(`${c.habit_id}:${c.date}`)
		}
		return set
	}, [normalizedCompletions])

	const completionLookup = useMemo(() => {
		const map = new Map<string, string>()
		for (const c of normalizedCompletions) {
			map.set(`${c.habit_id}:${c.date}`, c.id)
		}
		return map
	}, [normalizedCompletions])

	const [dialogOpen, setDialogOpen] = useState(false)
	const loadingHabitNames = useMemo(
		() => normalizedHabits.map((habit) => habit.name),
		[normalizedHabits],
	)

	const handleAddHabit = useCallback(
		(name: string, color: HabitColor) => {
			habitCollection.insert({
				id: crypto.randomUUID(),
				user_id: userId,
				name,
				color,
				archived: false,
				position: normalizedHabits.length,
				created_at: new Date(),
			})
			setDialogOpen(false)
		},
		[habitCollection, normalizedHabits.length, userId],
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
			if (event.canceled) return
			const { source, target } = event.operation
			if (!source || !target) return

			const updates = computeReorder(
				normalizedHabits.map((h) => h.id),
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
		[habitCollection, normalizedHabits],
	)

	const handleOlder = useCallback(() => {
		setOffset((currentOffset) => currentOffset + getResponsiveDayCount())
	}, [])

	const handleNewer = useCallback(() => {
		setOffset((currentOffset) => Math.max(0, currentOffset - getResponsiveDayCount()))
	}, [])

	if (habitsLoading || completionsLoading) {
		return <DashboardSkeleton offset={offset} habitNames={loadingHabitNames} />
	}

	return (
		<div className="overflow-hidden">
			<DashboardToolbar
				days={days}
				offset={offset}
				onOlder={handleOlder}
				onNewer={handleNewer}
				onReset={() => setOffset(0)}
				onAddHabit={() => setDialogOpen(true)}
			/>
			<DashboardHeader days={days} today={today} />

			<DragDropProvider onDragEnd={handleDragEnd}>
				<div className="flex flex-col gap-y-1">
					{normalizedHabits.map((h, index) => (
						<HabitRow
							key={h.id}
							habit={h}
							days={days}
							today={today}
							completionSet={completionSet}
							onToggle={handleToggle}
							onDelete={handleDeleteHabit}
							index={index}
						/>
					))}
				</div>
			</DragDropProvider>

			{normalizedHabits.length === 0 && (
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
	const [collections, setCollections] = useState<HabitCollections | null>(null)
	const [persistenceInitError, setPersistenceInitError] = useState<string | null>(null)
	const closeRef = useRef<(() => Promise<void>) | null>(null)

	useEffect(() => {
		let cancelled = false

		import('~/lib/collections.client')
			.then(({ createHabitCollections }) => createHabitCollections(window.location.origin))
			.then((c) => {
				if (cancelled) {
					return Promise.resolve(c.close()).catch(() => undefined)
				}

				setPersistenceInitError(null)
				closeRef.current = c.close
				setCollections(c)
			})
			.catch((error: unknown) => {
				if (cancelled) {
					return
				}

				closeRef.current = null
				setCollections(null)
				setPersistenceInitError(
					error instanceof Error ? error.message : 'Failed to initialize local persistence.',
				)
			})

		return () => {
			cancelled = true
			void closeRef.current?.()
		}
	}, [])

	if (persistenceInitError) {
		return (
			<div className="py-10 text-center text-sm text-muted-foreground">
				<p>failed to open local habit data.</p>
				<p>{persistenceInitError}</p>
			</div>
		)
	}

	if (!collections) {
		return <DashboardSkeleton />
	}

	return (
		<CollectionContext value={collections} key={userId}>
			<HabitGrid />
		</CollectionContext>
	)
}
