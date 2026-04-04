import { Temporal } from '@js-temporal/polyfill'
import { describe, expect, test } from 'vitest'
import { formatDateRange, formatDay, getDays, getToday } from './dates'

const date = (s: string) => Temporal.PlainDate.from(s)

describe('getToday', () => {
	test('returns injected date as YYYY-MM-DD', () => {
		expect(getToday(date('2026-04-04'))).toBe('2026-04-04')
	})

	test('returns a valid YYYY-MM-DD string without injection', () => {
		expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})
})

describe('getDays', () => {
	const now = date('2026-04-04')

	test('returns correct number of elements', () => {
		expect(getDays(7, 0, now)).toHaveLength(7)
		expect(getDays(3, 0, now)).toHaveLength(3)
	})

	test('last element is today when offset is 0', () => {
		const days = getDays(7, 0, now)
		expect(days[days.length - 1]).toBe('2026-04-04')
	})

	test('first element is (count-1) days before today when offset is 0', () => {
		const days = getDays(7, 0, now)
		expect(days[0]).toBe('2026-03-29')
	})

	test('elements are in ascending chronological order', () => {
		const days = getDays(7, 0, now)
		for (let i = 1; i < days.length; i++) {
			expect(days[i] > days[i - 1]).toBe(true)
		}
	})

	test('offset shifts the window backward', () => {
		const days = getDays(7, 7, now)
		expect(days[days.length - 1]).toBe('2026-03-28')
		expect(days[0]).toBe('2026-03-22')
	})

	test('crosses month boundary', () => {
		const days = getDays(5, 0, date('2026-03-03'))
		expect(days[0]).toBe('2026-02-27')
		expect(days[4]).toBe('2026-03-03')
	})

	test('crosses year boundary', () => {
		const days = getDays(5, 0, date('2026-01-02'))
		expect(days[0]).toBe('2025-12-29')
		expect(days[4]).toBe('2026-01-02')
	})

	test('handles leap year', () => {
		const days = getDays(3, 0, date('2028-03-01'))
		expect(days).toEqual(['2028-02-28', '2028-02-29', '2028-03-01'])
	})

	test('returns empty array when count is 0', () => {
		expect(getDays(0, 0, now)).toEqual([])
	})
})

describe('formatDay', () => {
	test('returns 2-char weekday abbreviation', () => {
		const { weekday } = formatDay('2026-04-04')
		expect(weekday).toHaveLength(2)
	})

	test('returns correct day number', () => {
		expect(formatDay('2026-04-04').day).toBe(4)
		expect(formatDay('2026-04-15').day).toBe(15)
		expect(formatDay('2026-01-01').day).toBe(1)
	})
})

describe('formatDateRange', () => {
	test('returns empty string for empty array', () => {
		expect(formatDateRange([])).toBe('')
	})

	test('single day formats correctly', () => {
		const result = formatDateRange(['2026-04-04'])
		expect(result).toMatch(/apr\s+4\s+–\s+apr\s+4/)
	})

	test('multi-day range uses separator', () => {
		const result = formatDateRange(['2026-03-29', '2026-03-30', '2026-04-04'])
		expect(result).toContain('–')
		expect(result).toMatch(/mar/)
		expect(result).toMatch(/apr/)
	})

	test('output is lowercase', () => {
		const result = formatDateRange(['2026-04-04', '2026-04-10'])
		expect(result).toBe(result.toLowerCase())
	})
})
