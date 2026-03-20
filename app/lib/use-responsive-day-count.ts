import { useSyncExternalStore } from 'react'

const CELL_SM = 40 // 2.5rem — matches size-10
const CELL_MD = 44 // 2.75rem — matches size-11
const NAME_COL = 150 // approx name + grip + delete
const MD_BREAKPOINT = 768
const MIN_DAYS = 3
const MAX_DAYS = 21

function compute(): number {
	const w = window.innerWidth
	const isMd = w >= MD_BREAKPOINT
	const padding = isMd ? 48 : 32
	const cell = isMd ? CELL_MD : CELL_SM
	const available = w - padding - NAME_COL
	const dayCount = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.floor(available / cell)))
	// Encode both values: dayCount in lower bits, isMd flag in bit 8
	return dayCount | (isMd ? 256 : 0)
}

function subscribe(callback: () => void) {
	window.addEventListener('resize', callback)
	return () => window.removeEventListener('resize', callback)
}

function getSnapshot() {
	return compute()
}

function getServerSnapshot() {
	return 7
}

export function useResponsiveDayCount() {
	const encoded = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
	const dayCount = encoded & 0xff
	const cellRem = encoded & 256 ? '2.75rem' : '2.5rem'
	return { dayCount, cellRem }
}
