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
