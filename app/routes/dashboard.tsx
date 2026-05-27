import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import {
	type ComponentProps,
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useOutletContext } from 'react-router'
import { ConsistencyBar } from '~/components/consistency-bar'
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
import { formatDayRangeLabel, getDayMeta, getDays, getToday } from '~/lib/dates'
import { HABIT_COLORS, type HabitColor, habitColorVar, nextHabitColor } from '~/lib/habit-colors'
import { computeReorder } from '~/lib/reorder'
import { useFittingDays, useResponsiveView, type View } from '~/lib/use-responsive-view'
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

const SKELETON_NAME_WIDTHS = ['w-14', 'w-18', 'w-16', 'w-20', 'w-15', 'w-22'] as const
const DASHBOARD_SKELETON_ROWS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5', 'row-6'] as const
const CONSISTENCY_WINDOW = 21
const MOBILE_CELL = 38
const MOBILE_CELL_GAP = 5
const MOBILE_TODAY_DOT = 20
const MOBILE_DAYS_VISIBLE = 7
const CARD_RESERVED_WIDTH = 48

type HabitRowData = { id: string; name: string; color: string; position: number }
type CompletionRowData = { id: string; habit_id: string; date: string }

const toHabitRowData = (value: unknown): HabitRowData | null => {
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

	return { id: row.id, name: row.name, color: row.color, position: row.position }
}

const toCompletionRowData = (value: unknown): CompletionRowData | null => {
	if (typeof value !== 'object' || value === null) return null

	const row = value as Record<string, unknown>
	if (
		typeof row.id !== 'string' ||
		typeof row.habit_id !== 'string' ||
		typeof row.date !== 'string'
	) {
		return null
	}

	return { id: row.id, habit_id: row.habit_id, date: row.date }
}

const AddHabitDialog = ({
	open,
	onOpenChange,
	onAdd,
	defaultColor,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onAdd: (name: string, color: HabitColor) => void
	defaultColor: HabitColor
}) => {
	const [name, setName] = useState('')
	const [color, setColor] = useState<HabitColor>(defaultColor)

	useEffect(() => {
		if (open) setColor(defaultColor)
	}, [open, defaultColor])

	const handleSubmit = () => {
		if (!name.trim()) return
		onAdd(name.trim(), color)
		setName('')
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
					className="h-9 w-full rounded-full border border-foreground bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:shadow-brutal-sm"
					autoFocus
				/>
				<div className="flex flex-wrap gap-2">
					{HABIT_COLORS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => setColor(c)}
							className={cn(
								'size-9 rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
								color === c &&
									'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background',
							)}
							style={{ backgroundColor: `var(--habit-${c})` }}
						/>
					))}
				</div>
				<DialogFooter>
					<DialogClose
						render={
							<Button
								variant="ghost"
								size="sm"
								className="rounded-full border border-divider-strong"
							/>
						}
					>
						cancel
					</DialogClose>
					<Button
						variant="ghost"
						size="sm"
						className="rounded-full border border-divider-strong"
						onClick={handleSubmit}
					>
						add
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

const DashboardToolbar = ({
	rangeLabel,
	weekOffset,
	onOlder,
	onNewer,
	onReset,
	onAddHabit,
	skeleton = false,
}: {
	rangeLabel: string
	weekOffset: number
	onOlder?: () => void
	onNewer?: () => void
	onReset?: () => void
	onAddHabit?: () => void
	skeleton?: boolean
}) => (
	<div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
		<div className="flex min-w-0 items-center gap-2 sm:gap-3.5">
			<button
				type="button"
				onClick={onOlder}
				disabled={skeleton}
				aria-label="previous weeks"
				className="flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none sm:size-8"
			>
				<ChevronLeft className="size-5" />
			</button>
			<span className="flex min-w-24 items-center justify-center text-center text-base font-medium tracking-[-0.2px] tabular-nums sm:text-[18px]">
				{skeleton ? <Skeleton className="h-3.5 w-20 rounded-sm bg-muted/50" /> : rangeLabel}
			</span>
			<button
				type="button"
				onClick={onNewer}
				disabled={skeleton || weekOffset === 0}
				aria-label="next weeks"
				className="flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-30 sm:size-8"
			>
				<ChevronRight className="size-5" />
			</button>
			{weekOffset > 0 && (
				<button
					type="button"
					onClick={onReset}
					className="rounded-full px-2 py-0.5 text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				>
					today
				</button>
			)}
		</div>
		<Button
			variant="ghost"
			size="sm"
			onClick={onAddHabit}
			disabled={skeleton}
			className="shrink-0 rounded-full border border-divider-strong tracking-[-0.1px]"
		>
			+ <span className="hidden sm:inline">add habit</span>
			<span className="sm:hidden">add</span>
		</Button>
	</div>
)

type DayHeaderProps = {
	dateStr: string
	today: string
	cellSize: number
	todayDot: number
}

const DayHeader = ({ dateStr, today, cellSize, todayDot }: DayHeaderProps) => {
	const meta = getDayMeta(dateStr, today)
	const labelClass = meta.isWeekend ? 'text-text-faint' : 'text-ink-soft'

	return (
		<div
			className={cn('flex flex-col items-center gap-1 pb-3', labelClass)}
			style={{ width: cellSize }}
		>
			<span className="text-[11px] font-medium tracking-[0.2px] opacity-90">{meta.weekday}</span>
			{meta.isToday ? (
				<span
					className="flex items-center justify-center rounded-full bg-foreground text-[11px] font-semibold tabular-nums text-today-dot-text"
					style={{ width: todayDot, height: todayDot }}
				>
					{meta.day}
				</span>
			) : (
				<span
					className={cn(
						'text-xs font-medium tabular-nums',
						meta.isWeekend ? 'opacity-70' : 'opacity-90',
					)}
					style={{ height: todayDot, lineHeight: `${todayDot}px` }}
				>
					{meta.day}
				</span>
			)}
		</div>
	)
}

type CellProps = {
	dateStr: string
	today: string
	done: boolean
	colorVar: string
	cellSize: number
	onToggle: () => void
}

const Cell = ({ dateStr, today, done, colorVar, cellSize, onToggle }: CellProps) => {
	const meta = getDayMeta(dateStr, today)
	const radius = Math.round(cellSize * 0.13)
	const futureOpacity = meta.isFuture ? 0.55 : 1
	const baseStyle: CSSProperties = {
		width: cellSize,
		height: cellSize,
		borderRadius: radius,
		flex: '0 0 auto',
		transition: 'transform 120ms ease, opacity 120ms ease, background 120ms ease',
		touchAction: 'manipulation',
		WebkitTapHighlightColor: 'transparent',
	}

	if (done) {
		return (
			<button
				type="button"
				aria-label={`toggle ${dateStr}`}
				disabled={meta.isFuture}
				onClick={onToggle}
				style={{
					...baseStyle,
					background: colorVar,
					border: 'none',
					padding: 0,
					opacity: futureOpacity,
					cursor: meta.isFuture ? 'default' : 'pointer',
				}}
				className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			/>
		)
	}

	return (
		<button
			type="button"
			aria-label={`toggle ${dateStr}`}
			disabled={meta.isFuture}
			onClick={onToggle}
			className={cn(
				'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
				meta.isFuture ? 'opacity-20' : 'opacity-30 hover:opacity-65',
			)}
			style={{
				...baseStyle,
				background: 'transparent',
				border: `1.5px dashed ${colorVar}`,
				color: colorVar,
				padding: 0,
				cursor: meta.isFuture ? 'default' : 'pointer',
			}}
		/>
	)
}

const DeleteHabitIcon = () => (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
		<title>Delete</title>
		<path d="M18 6 6 18M6 6l12 12" />
	</svg>
)

type MatrixHabitRowProps = {
	habit: HabitRowData
	index: number
	view: Extract<View, { mode: 'matrix' }>
	days: string[]
	today: string
	completionSet: Set<string>
	consistency: number
	onToggle: (habitId: string, date: string) => void
	onDelete: (id: string) => void
}

const MatrixHabitRow = ({
	habit,
	index,
	view,
	days,
	today,
	completionSet,
	consistency,
	onToggle,
	onDelete,
}: MatrixHabitRowProps) => {
	const { ref, handleRef, isDragSource } = useSortable({
		id: habit.id,
		index,
		group: 'habits',
	})
	const colorVar = habitColorVar(habit.color)

	return (
		<div ref={ref} className={cn('flex items-center', isDragSource && 'opacity-50')}>
			<div
				className="group/row sticky left-0 z-10 flex shrink-0 items-center justify-end gap-2.5 bg-background pr-6"
				style={{ width: view.namesColWidth, height: view.cellSize }}
			>
				<div className="absolute inset-y-0 left-1 flex items-center gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
					<button
						type="button"
						ref={handleRef}
						className="cursor-grab touch-none rounded-full p-0.5 text-muted-foreground active:cursor-grabbing"
						tabIndex={-1}
						aria-label="drag to reorder"
					>
						<GripVertical className="size-4" />
					</button>
					<button
						type="button"
						onClick={() => onDelete(habit.id)}
						className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						title="delete habit"
						aria-label={`delete ${habit.name}`}
					>
						<DeleteHabitIcon />
					</button>
				</div>
				<span className="min-w-0 truncate text-[17px] tracking-[-0.1px]">{habit.name}</span>
				<ConsistencyBar value={consistency} colorVar={colorVar} height={view.cellSize - 6} />
			</div>
			<div className="relative flex" style={{ gap: view.cellGap }}>
				{days.map((dateStr, di) => {
					const meta = getDayMeta(dateStr, today)
					if (!meta.isWeekend) return null
					const left = di * (view.cellSize + view.cellGap)
					return (
						<div
							key={`tint-${dateStr}`}
							aria-hidden
							className="pointer-events-none absolute rounded-lg bg-weekend-tint"
							style={{
								left: left - 4,
								top: -4,
								bottom: -4,
								width: view.cellSize + 8,
							}}
						/>
					)
				})}
				{days.map((dateStr) => (
					<Cell
						key={dateStr}
						dateStr={dateStr}
						today={today}
						done={completionSet.has(`${habit.id}:${dateStr}`)}
						colorVar={colorVar}
						cellSize={view.cellSize}
						onToggle={() => onToggle(habit.id, dateStr)}
					/>
				))}
			</div>
		</div>
	)
}

const MatrixView = ({
	habits,
	days,
	today,
	view,
	completionSet,
	consistencyByHabit,
	onToggle,
	onDelete,
}: {
	habits: HabitRowData[]
	days: string[]
	today: string
	view: Extract<View, { mode: 'matrix' }>
	completionSet: Set<string>
	consistencyByHabit: Map<string, number>
	onToggle: (habitId: string, date: string) => void
	onDelete: (id: string) => void
}) => (
	<div className="flex flex-col">
		<div className="flex">
			<div className="shrink-0" style={{ width: view.namesColWidth }} />
			<div className="flex" style={{ gap: view.cellGap }}>
				{days.map((dateStr) => (
					<DayHeader
						key={dateStr}
						dateStr={dateStr}
						today={today}
						cellSize={view.cellSize}
						todayDot={view.todayDot}
					/>
				))}
			</div>
		</div>
		<div className="flex flex-col" style={{ gap: view.rowGap }}>
			{habits.map((habit, index) => (
				<MatrixHabitRow
					key={habit.id}
					habit={habit}
					index={index}
					view={view}
					days={days}
					today={today}
					completionSet={completionSet}
					consistency={consistencyByHabit.get(habit.id) ?? 0}
					onToggle={onToggle}
					onDelete={onDelete}
				/>
			))}
		</div>
	</div>
)

type CardProps = {
	habit: HabitRowData
	index: number
	days: string[]
	today: string
	completionSet: Set<string>
	consistency: number
	onToggle: (habitId: string, date: string) => void
	onDelete: (id: string) => void
}

const HabitCard = ({
	habit,
	index,
	days,
	today,
	completionSet,
	consistency,
	onToggle,
	onDelete,
}: CardProps) => {
	const { ref, handleRef, isDragSource } = useSortable({
		id: habit.id,
		index,
		group: 'habits',
	})
	const colorVar = habitColorVar(habit.color)

	return (
		<div
			ref={ref}
			className={cn(
				'group/card border-t border-divider-soft py-4 pr-5 pl-7 first:border-t-0',
				isDragSource && 'opacity-50',
			)}
		>
			<div className="mb-3 flex items-center justify-between gap-2">
				<span className="min-w-0 truncate text-[17px] font-medium tracking-[-0.2px]">
					{habit.name}
				</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						ref={handleRef}
						className="cursor-grab touch-none rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 active:cursor-grabbing"
						tabIndex={-1}
						aria-label="drag to reorder"
					>
						<GripVertical className="size-4" />
					</button>
					<button
						type="button"
						onClick={() => onDelete(habit.id)}
						className="rounded-full p-1 text-muted-foreground opacity-0 outline-none transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group-focus-within/card:opacity-100 group-hover/card:opacity-100"
						aria-label={`delete ${habit.name}`}
					>
						<DeleteHabitIcon />
					</button>
				</div>
			</div>
			<div className="relative flex" style={{ gap: MOBILE_CELL_GAP }}>
				<ConsistencyBar
					value={consistency}
					colorVar={colorVar}
					width={4}
					height={MOBILE_CELL}
					style={{ position: 'absolute', left: -12, top: 0 }}
				/>
				{days.map((dateStr, di) => {
					const meta = getDayMeta(dateStr, today)
					if (!meta.isWeekend) return null
					const left = di * (MOBILE_CELL + MOBILE_CELL_GAP)
					return (
						<div
							key={`tint-${dateStr}`}
							aria-hidden
							className="pointer-events-none absolute rounded-lg bg-weekend-tint"
							style={{
								left: left - 3,
								top: -3,
								bottom: -3,
								width: MOBILE_CELL + 6,
							}}
						/>
					)
				})}
				{days.map((dateStr) => (
					<Cell
						key={dateStr}
						dateStr={dateStr}
						today={today}
						done={completionSet.has(`${habit.id}:${dateStr}`)}
						colorVar={colorVar}
						cellSize={MOBILE_CELL}
						onToggle={() => onToggle(habit.id, dateStr)}
					/>
				))}
			</div>
		</div>
	)
}

const MobileDayHeader = ({ days, today }: { days: string[]; today: string }) => (
	<div className="flex px-7 pt-1 pb-3" style={{ gap: MOBILE_CELL_GAP }}>
		{days.map((dateStr) => {
			const meta = getDayMeta(dateStr, today)
			const labelClass = meta.isWeekend ? 'text-text-faint' : 'text-ink-soft'
			return (
				<div
					key={dateStr}
					className={cn('flex flex-col items-center gap-1', labelClass)}
					style={{ width: MOBILE_CELL }}
				>
					<span className="text-[10px] font-medium tracking-[0.2px] opacity-90">
						{meta.weekday}
					</span>
					{meta.isToday ? (
						<span
							className="flex items-center justify-center rounded-full bg-foreground text-[11px] font-semibold tabular-nums text-today-dot-text"
							style={{ width: MOBILE_TODAY_DOT, height: MOBILE_TODAY_DOT }}
						>
							{meta.day}
						</span>
					) : (
						<span
							className={cn(
								'text-xs font-medium tabular-nums',
								meta.isWeekend ? 'opacity-70' : 'opacity-90',
							)}
							style={{ height: MOBILE_TODAY_DOT, lineHeight: `${MOBILE_TODAY_DOT}px` }}
						>
							{meta.day}
						</span>
					)}
				</div>
			)
		})}
	</div>
)

const CardsView = ({
	habits,
	days,
	today,
	completionSet,
	consistencyByHabit,
	onToggle,
	onDelete,
}: {
	habits: HabitRowData[]
	days: string[]
	today: string
	completionSet: Set<string>
	consistencyByHabit: Map<string, number>
	onToggle: (habitId: string, date: string) => void
	onDelete: (id: string) => void
}) => (
	<div className="-mx-4 flex flex-col sm:-mx-6">
		<MobileDayHeader days={days} today={today} />
		{habits.map((habit, index) => (
			<HabitCard
				key={habit.id}
				habit={habit}
				index={index}
				days={days}
				today={today}
				completionSet={completionSet}
				consistency={consistencyByHabit.get(habit.id) ?? 0}
				onToggle={onToggle}
				onDelete={onDelete}
			/>
		))}
	</div>
)

const computeConsistency = (
	habitId: string,
	today: string,
	completionSet: Set<string>,
	now = getToday(),
): number => {
	const days: string[] = []
	const todayDate = new Date(`${now}T00:00:00Z`)
	for (let i = CONSISTENCY_WINDOW - 1; i >= 0; i--) {
		const d = new Date(todayDate)
		d.setUTCDate(d.getUTCDate() - i)
		days.push(d.toISOString().slice(0, 10))
	}
	const eligible = days.filter((d) => d <= today)
	if (eligible.length === 0) return 0
	let hits = 0
	for (const d of eligible) {
		if (completionSet.has(`${habitId}:${d}`)) hits++
	}
	return hits / eligible.length
}

const SKELETON_MATRIX_CELL = 64
const SKELETON_MATRIX_CELL_GAP = 10
const SKELETON_MATRIX_ROW_GAP = 12
const SKELETON_MATRIX_NAMES_WIDTH = 220
const SKELETON_MATRIX_TODAY_DOT = 22
const SKELETON_MATRIX_DAYS = 14

const SkeletonDayHeader = ({ cellSize, todayDot }: { cellSize: number; todayDot: number }) => (
	<div className="flex flex-col items-center gap-1 pb-3" style={{ width: cellSize }}>
		<div className="h-2.5 w-5 rounded-sm bg-muted/50" />
		<div className="rounded-full bg-muted/40" style={{ width: todayDot, height: todayDot }} />
	</div>
)

const SkeletonNameLabel = ({ rowIndex, habitName }: { rowIndex: number; habitName?: string }) =>
	habitName ? (
		<span className="truncate text-[17px] tracking-[-0.1px]">{habitName}</span>
	) : (
		<Skeleton
			className={cn(
				'h-3.5 rounded-sm border border-border/40 bg-muted/50 dark:border-border/50 dark:bg-muted/20',
				SKELETON_NAME_WIDTHS[rowIndex % SKELETON_NAME_WIDTHS.length],
			)}
		/>
	)

const MatrixSkeleton = ({
	rows,
	habitNames,
}: {
	rows: readonly string[]
	habitNames?: string[]
}) => {
	const dayIndices = Array.from({ length: SKELETON_MATRIX_DAYS }, (_, i) => i)
	return (
		<div className="flex flex-col">
			<div className="flex">
				<div className="shrink-0" style={{ width: SKELETON_MATRIX_NAMES_WIDTH }} />
				<div className="flex" style={{ gap: SKELETON_MATRIX_CELL_GAP }}>
					{dayIndices.map((i) => (
						<SkeletonDayHeader
							key={i}
							cellSize={SKELETON_MATRIX_CELL}
							todayDot={SKELETON_MATRIX_TODAY_DOT}
						/>
					))}
				</div>
			</div>
			<div className="flex flex-col" style={{ gap: SKELETON_MATRIX_ROW_GAP }}>
				{rows.map((rowKey, rowIndex) => (
					<div key={rowKey} className="flex items-center">
						<div
							className="flex shrink-0 items-center justify-end gap-2.5 pr-6"
							style={{ width: SKELETON_MATRIX_NAMES_WIDTH, height: SKELETON_MATRIX_CELL }}
						>
							<SkeletonNameLabel rowIndex={rowIndex} habitName={habitNames?.[rowIndex]} />
							<div
								className="w-[5px] bg-divider-soft"
								style={{ height: SKELETON_MATRIX_CELL - 6, borderRadius: 3 }}
							/>
						</div>
						<div className="flex" style={{ gap: SKELETON_MATRIX_CELL_GAP }}>
							{dayIndices.map((i) => (
								<div
									key={i}
									className="border border-dashed border-divider-soft bg-transparent"
									style={{
										width: SKELETON_MATRIX_CELL,
										height: SKELETON_MATRIX_CELL,
										borderRadius: Math.round(SKELETON_MATRIX_CELL * 0.13),
									}}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

const SkeletonMobileDayHeader = () => {
	const dayIndices = Array.from({ length: MOBILE_DAYS_VISIBLE }, (_, i) => i)
	return (
		<div className="flex px-7 pt-1 pb-3" style={{ gap: MOBILE_CELL_GAP }}>
			{dayIndices.map((i) => (
				<div key={i} className="flex flex-col items-center gap-1" style={{ width: MOBILE_CELL }}>
					<div className="h-2.5 w-4 rounded-sm bg-muted/50" />
					<div
						className="rounded-full bg-muted/40"
						style={{ width: MOBILE_TODAY_DOT, height: MOBILE_TODAY_DOT }}
					/>
				</div>
			))}
		</div>
	)
}

const CardsSkeleton = ({
	rows,
	habitNames,
}: {
	rows: readonly string[]
	habitNames?: string[]
}) => {
	const dayIndices = Array.from({ length: MOBILE_DAYS_VISIBLE }, (_, i) => i)
	return (
		<div className="-mx-4 flex flex-col sm:-mx-6">
			<SkeletonMobileDayHeader />
			{rows.map((rowKey, rowIndex) => (
				<div key={rowKey} className="border-t border-divider-soft py-4 pr-5 pl-7 first:border-t-0">
					<div className="mb-3 flex items-center gap-2">
						<SkeletonNameLabel rowIndex={rowIndex} habitName={habitNames?.[rowIndex]} />
					</div>
					<div className="relative flex" style={{ gap: MOBILE_CELL_GAP }}>
						<div
							aria-hidden
							className="bg-divider-soft"
							style={{
								position: 'absolute',
								left: -12,
								top: 0,
								width: 4,
								height: MOBILE_CELL,
								borderRadius: 3,
							}}
						/>
						{dayIndices.map((i) => (
							<div
								key={i}
								className="border border-dashed border-divider-soft bg-transparent"
								style={{
									width: MOBILE_CELL,
									height: MOBILE_CELL,
									borderRadius: Math.round(MOBILE_CELL * 0.13),
								}}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

const DashboardSkeleton = ({ habitNames }: { habitNames?: string[] }) => {
	const rows = habitNames?.length ? habitNames : DASHBOARD_SKELETON_ROWS

	return (
		<div>
			<DashboardToolbar rangeLabel="" weekOffset={0} skeleton />
			<div className="hidden sm:block">
				<MatrixSkeleton rows={rows} habitNames={habitNames} />
			</div>
			<div className="sm:hidden">
				<CardsSkeleton rows={rows} habitNames={habitNames} />
			</div>
		</div>
	)
}

const HabitTracker = () => {
	const { userId } = useOutletContext<{ userId: string }>()
	const { habitCollection, completionCollection } = useCollections()
	const view = useResponsiveView()

	const { data: habits, isLoading: habitsLoading } = useLiveQuery((q) =>
		q
			.from({ habits: habitCollection })
			.where(({ habits }) => eq(habits.archived, false))
			.orderBy(({ habits }) => habits.position, 'asc'),
	)

	const { data: completions, isLoading: completionsLoading } = useLiveQuery((q) =>
		q.from({ completions: completionCollection }),
	)

	const [weekOffset, setWeekOffset] = useState(0)
	const reservedWidth = view.mode === 'matrix' ? view.namesColWidth : CARD_RESERVED_WIDTH
	const [measureRef, fittingDays] = useFittingDays({
		cellSize: view.cellSize,
		cellGap: view.cellGap,
		reservedWidth,
	})
	const daysVisible = view.mode === 'matrix' ? fittingDays : MOBILE_DAYS_VISIBLE
	const days = useMemo(() => getDays(daysVisible, weekOffset * 7), [daysVisible, weekOffset])
	const today = getToday()
	const rangeLabel = useMemo(() => formatDayRangeLabel(days), [days])

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

	const consistencyByHabit = useMemo(() => {
		const map = new Map<string, number>()
		for (const h of normalizedHabits) {
			map.set(h.id, computeConsistency(h.id, today, completionSet))
		}
		return map
	}, [normalizedHabits, completionSet, today])

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

	const handleDragEnd: ComponentProps<typeof DragDropProvider>['onDragEnd'] = useCallback(
		(event) => {
			if (event.canceled) return
			const { source } = event.operation
			if (!source || !('initialIndex' in source)) return

			const fromIndex = source.initialIndex as number
			const toIndex = (source as typeof source & { index: number }).index

			const updates = computeReorder(
				normalizedHabits.map((h) => h.id),
				fromIndex,
				toIndex,
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
		setWeekOffset((current) => current + 1)
	}, [])

	const handleNewer = useCallback(() => {
		setWeekOffset((current) => Math.max(0, current - 1))
	}, [])

	const handleAddOpen = useCallback(() => setDialogOpen(true), [])
	const handleAddOpenChange = useCallback((open: boolean) => setDialogOpen(open), [])

	const nextColor = nextHabitColor(normalizedHabits.length)

	if (habitsLoading || completionsLoading) {
		return <DashboardSkeleton habitNames={loadingHabitNames} />
	}

	return (
		<div ref={measureRef}>
			<DashboardToolbar
				rangeLabel={rangeLabel}
				weekOffset={weekOffset}
				onOlder={handleOlder}
				onNewer={handleNewer}
				onReset={() => setWeekOffset(0)}
				onAddHabit={handleAddOpen}
			/>

			<DragDropProvider onDragEnd={handleDragEnd}>
				{view.mode === 'cards' ? (
					<CardsView
						habits={normalizedHabits}
						days={days}
						today={today}
						completionSet={completionSet}
						consistencyByHabit={consistencyByHabit}
						onToggle={handleToggle}
						onDelete={handleDeleteHabit}
					/>
				) : (
					<MatrixView
						habits={normalizedHabits}
						days={days}
						today={today}
						view={view}
						completionSet={completionSet}
						consistencyByHabit={consistencyByHabit}
						onToggle={handleToggle}
						onDelete={handleDeleteHabit}
					/>
				)}
			</DragDropProvider>

			{normalizedHabits.length === 0 && (
				<p className="py-10 text-center text-muted-foreground">
					no habits yet. add one to get started.
				</p>
			)}

			<AddHabitDialog
				open={dialogOpen}
				onOpenChange={handleAddOpenChange}
				onAdd={handleAddHabit}
				defaultColor={nextColor}
			/>
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
			<HabitTracker />
		</CollectionContext>
	)
}
