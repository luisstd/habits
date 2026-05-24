export const HABIT_COLORS = [
	'marigold',
	'coral',
	'terracotta',
	'sage',
	'moss',
	'ocean',
	'slate',
	'iris',
	'lavender',
	'rose',
] as const

export type HabitColor = (typeof HABIT_COLORS)[number]

const LEGACY_COLOR_MAP: Record<string, HabitColor> = { amber: 'marigold' }

export const habitColorVar = (color: string): string => {
	const mapped = LEGACY_COLOR_MAP[color] ?? color
	const resolved = (HABIT_COLORS as readonly string[]).includes(mapped) ? mapped : 'coral'
	return `var(--habit-${resolved})`
}

export const nextHabitColor = (index: number): HabitColor =>
	HABIT_COLORS[index % HABIT_COLORS.length]
