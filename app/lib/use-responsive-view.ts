import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react'

export type MatrixView = {
	mode: 'matrix'
	cellSize: number
	cellGap: number
	rowGap: number
	namesColWidth: number
	todayDot: number
}

export type CardsView = {
	mode: 'cards'
	cellSize: 38
	cellGap: 5
	todayDot: 20
}

export type View = MatrixView | CardsView

const matrix = (cellSize: number, namesColWidth: number): MatrixView => ({
	mode: 'matrix',
	cellSize,
	cellGap: Math.round(cellSize * 0.16),
	rowGap: Math.round(cellSize * 0.18),
	namesColWidth,
	todayDot: Math.max(18, Math.round(cellSize * 0.34)),
})

const cards = (): CardsView => ({ mode: 'cards', cellSize: 38, cellGap: 5, todayDot: 20 })

type Tuple = { query: string; view: View }

export const VIEW_BREAKPOINTS: readonly Tuple[] = [
	{ query: '(min-width: 1280px)', view: matrix(64, 220) },
	{ query: '(min-width: 1024px)', view: matrix(56, 200) },
	{ query: '(min-width: 640px)', view: matrix(48, 180) },
]

export const DEFAULT_VIEW: View = matrix(64, 220)
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

export const useFittingDays = ({
	cellSize,
	cellGap,
	reservedWidth,
	min = 1,
	max = 70,
}: {
	cellSize: number
	cellGap: number
	reservedWidth: number
	min?: number
	max?: number
}): [(node: HTMLElement | null) => void, number] => {
	const [el, setEl] = useState<HTMLElement | null>(null)
	const [count, setCount] = useState<number>(min)

	const ref = useCallback((node: HTMLElement | null) => setEl(node), [])

	useLayoutEffect(() => {
		if (!el || typeof ResizeObserver === 'undefined') return

		const measure = () => {
			const available = el.clientWidth - reservedWidth
			const slot = cellSize + cellGap
			if (slot <= 0) return
			// largest n with n*cellSize + (n-1)*cellGap <= available
			const fits = Math.floor((available + cellGap) / slot)
			setCount(Math.max(min, Math.min(max, fits)))
		}

		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(el)
		return () => observer.disconnect()
	}, [el, cellSize, cellGap, reservedWidth, min, max])

	return [ref, count]
}
