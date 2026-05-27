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

export const habitColorVar = (color: string): string => {
	const resolved = (HABIT_COLORS as readonly string[]).includes(color) ? color : 'coral'
	return `var(--habit-${resolved})`
}

export const nextHabitColor = (index: number): HabitColor =>
	HABIT_COLORS[index % HABIT_COLORS.length]
