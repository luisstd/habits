import { Temporal } from '@js-temporal/polyfill'

export function getToday(now?: Temporal.PlainDate): string {
	return (now ?? Temporal.Now.plainDateISO()).toString()
}

export function getDays(count: number, offset: number, now?: Temporal.PlainDate): string[] {
	const today = now ?? Temporal.Now.plainDateISO()
	const days: string[] = []
	for (let i = count - 1 + offset; i >= offset; i--) {
		days.push(today.subtract({ days: i }).toString())
	}
	return days
}

export function formatDay(dateStr: string): { weekday: string; day: number } {
	const date = Temporal.PlainDate.from(dateStr)
	return {
		weekday: date.toLocaleString('en', { weekday: 'short' }).slice(0, 2),
		day: date.day,
	}
}

export function formatDateRange(days: string[]): string {
	if (days.length === 0) return ''
	const fmt = (dateStr: string) => {
		const date = Temporal.PlainDate.from(dateStr)
		return date.toLocaleString('en', { month: 'short', day: 'numeric' }).toLowerCase()
	}
	return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`
}

const MONTH_ABBR = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec',
] as const

export function getWeekAlignedRange(
	weeksVisible: number,
	weekOffset: number,
	now?: Temporal.PlainDate,
): string[] {
	if (weeksVisible <= 0) return []
	const today = now ?? Temporal.Now.plainDateISO()
	const thisWeekSunday = today.add({ days: 7 - today.dayOfWeek })
	const endSunday = thisWeekSunday.subtract({ weeks: Math.max(0, weekOffset) })
	const totalDays = weeksVisible * 7
	const days: string[] = []
	for (let i = totalDays - 1; i >= 0; i--) {
		days.push(endSunday.subtract({ days: i }).toString())
	}
	return days
}

export function chunkIntoWeeks(days: string[]): string[][] {
	if (days.length === 0) return []
	const weeks: string[][] = []
	let current: string[] = []
	for (const day of days) {
		current.push(day)
		if (Temporal.PlainDate.from(day).dayOfWeek === 7) {
			weeks.push(current)
			current = []
		}
	}
	if (current.length > 0) weeks.push(current)
	return weeks
}

export function formatWeekRangeLabel(days: string[]): string {
	if (days.length === 0) return ''
	const first = Temporal.PlainDate.from(days[0])
	const last = Temporal.PlainDate.from(days[days.length - 1])
	const m1 = MONTH_ABBR[first.month - 1]
	const m2 = MONTH_ABBR[last.month - 1]
	if (first.month === last.month && first.year === last.year) {
		return `${m1} ${first.day} – ${last.day}`
	}
	return `${m1} ${first.day} – ${m2} ${last.day}`
}

export type DayMeta = {
	dateStr: string
	weekday: string
	day: number
	isWeekend: boolean
	isSunday: boolean
	isToday: boolean
	isFuture: boolean
}

export function getDayMeta(dateStr: string, today: string): DayMeta {
	const date = Temporal.PlainDate.from(dateStr)
	const dow = date.dayOfWeek
	return {
		dateStr,
		weekday: date.toLocaleString('en', { weekday: 'short' }).slice(0, 2).toLowerCase(),
		day: date.day,
		isWeekend: dow === 6 || dow === 7,
		isSunday: dow === 7,
		isToday: dateStr === today,
		isFuture: dateStr > today,
	}
}
