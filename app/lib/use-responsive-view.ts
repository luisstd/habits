import { useSyncExternalStore } from 'react'

export type MatrixView = {
	mode: 'matrix'
	weeksVisible: number
	cellSize: number
	cellGap: number
	rowGap: number
	weekGap: number
	namesColWidth: number
	todayDot: number
}

export type CardsView = {
	mode: 'cards'
	weeksVisible: 1
	cellSize: 38
}

export type View = MatrixView | CardsView

const matrix = (
	weeksVisible: number,
	cellSize: number,
	weekGap: number,
	namesColWidth: number,
): MatrixView => ({
	mode: 'matrix',
	weeksVisible,
	cellSize,
	cellGap: Math.round(cellSize * 0.16),
	rowGap: Math.round(cellSize * 0.18),
	weekGap,
	namesColWidth,
	todayDot: Math.max(18, Math.round(cellSize * 0.34)),
})

const cards = (): CardsView => ({ mode: 'cards', weeksVisible: 1, cellSize: 38 })

type Tuple = { query: string; view: View }

export const VIEW_BREAKPOINTS: readonly Tuple[] = [
	{ query: '(min-width: 1536px)', view: matrix(4, 64, 28, 220) },
	{ query: '(min-width: 1280px)', view: matrix(3, 64, 28, 220) },
	{ query: '(min-width: 1024px)', view: matrix(3, 56, 24, 200) },
	{ query: '(min-width: 768px)', view: matrix(2, 48, 20, 180) },
	{ query: '(min-width: 640px)', view: matrix(1, 48, 20, 180) },
]

export const DEFAULT_VIEW: View = matrix(3, 64, 28, 220)
export const MOBILE_VIEW: View = cards()

const resolveView = (): View => {
	if (typeof window === 'undefined') return DEFAULT_VIEW
	for (const { query, view } of VIEW_BREAKPOINTS) {
		if (window.matchMedia(query).matches) return view
	}
	return MOBILE_VIEW
}

const subscribe = (onChange: () => void) => {
	if (typeof window === 'undefined') return () => {}
	const lists = [...VIEW_BREAKPOINTS.map((b) => b.query), '(max-width: 639px)'].map((q) =>
		window.matchMedia(q),
	)
	for (const list of lists) list.addEventListener('change', onChange)
	return () => {
		for (const list of lists) list.removeEventListener('change', onChange)
	}
}

export const useResponsiveView = (): View =>
	useSyncExternalStore(subscribe, resolveView, () => DEFAULT_VIEW)
