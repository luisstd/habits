export const DASHBOARD_MAX_DAYS = 21

const breakpointDayCounts = [
	{ query: '(min-width: 1536px)', count: 21 },
	{ query: '(min-width: 1280px)', count: 18 },
	{ query: '(min-width: 1024px)', count: 14 },
	{ query: '(min-width: 768px)', count: 10 },
	{ query: '(min-width: 640px)', count: 7 },
] as const

export const dashboardGridColsClassName =
	'grid-cols-[minmax(0,1fr)_repeat(5,2.5rem)] sm:grid-cols-[minmax(0,1fr)_repeat(7,2.5rem)] md:grid-cols-[minmax(0,1fr)_repeat(10,2.75rem)] lg:grid-cols-[minmax(0,1fr)_repeat(14,2.75rem)] xl:grid-cols-[minmax(0,1fr)_repeat(18,2.75rem)] 2xl:grid-cols-[minmax(0,1fr)_repeat(21,2.75rem)]'

export const dashboardVisibleRanges = [
	{ count: 5, className: 'sm:hidden' },
	{ count: 7, className: 'hidden sm:inline md:hidden' },
	{ count: 10, className: 'hidden md:inline lg:hidden' },
	{ count: 14, className: 'hidden lg:inline xl:hidden' },
	{ count: 18, className: 'hidden xl:inline 2xl:hidden' },
	{ count: 21, className: 'hidden 2xl:inline' },
] as const

export function getResponsiveDayCount() {
	if (typeof window === 'undefined') return 5

	for (const breakpoint of breakpointDayCounts) {
		if (window.matchMedia(breakpoint.query).matches) {
			return breakpoint.count
		}
	}

	return 5
}

export function getResponsiveDayVisibilityClass(index: number) {
	if (index >= DASHBOARD_MAX_DAYS - 5) return ''
	if (index >= DASHBOARD_MAX_DAYS - 7) return 'hidden sm:flex'
	if (index >= DASHBOARD_MAX_DAYS - 10) return 'hidden md:flex'
	if (index >= DASHBOARD_MAX_DAYS - 14) return 'hidden lg:flex'
	if (index >= DASHBOARD_MAX_DAYS - 18) return 'hidden xl:flex'
	return 'hidden 2xl:flex'
}
