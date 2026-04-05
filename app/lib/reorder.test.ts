import { describe, expect, test } from 'vitest'
import { computeReorder } from './reorder'

describe('computeReorder', () => {
	test('move forward: index 0 to 2', () => {
		const updates = computeReorder(['A', 'B', 'C', 'D'], 0, 2)
		expect(updates).toEqual([
			{ id: 'B', position: 0 },
			{ id: 'C', position: 1 },
			{ id: 'A', position: 2 },
		])
	})

	test('move backward: index 2 to 0', () => {
		const updates = computeReorder(['A', 'B', 'C', 'D'], 2, 0)
		expect(updates).toEqual([
			{ id: 'C', position: 0 },
			{ id: 'A', position: 1 },
			{ id: 'B', position: 2 },
		])
	})

	test('adjacent swap', () => {
		const updates = computeReorder(['A', 'B', 'C'], 0, 1)
		expect(updates).toEqual([
			{ id: 'B', position: 0 },
			{ id: 'A', position: 1 },
		])
	})

	test('two-element swap', () => {
		const updates = computeReorder(['A', 'B'], 0, 1)
		expect(updates).toEqual([
			{ id: 'B', position: 0 },
			{ id: 'A', position: 1 },
		])
	})

	test('returns null when fromIndex === toIndex', () => {
		expect(computeReorder(['A', 'B', 'C'], 0, 0)).toBeNull()
	})

	test('returns null when fromIndex out of bounds', () => {
		expect(computeReorder(['A', 'B', 'C'], -1, 1)).toBeNull()
		expect(computeReorder(['A', 'B', 'C'], 3, 1)).toBeNull()
	})

	test('returns null when toIndex out of bounds', () => {
		expect(computeReorder(['A', 'B', 'C'], 0, -1)).toBeNull()
		expect(computeReorder(['A', 'B', 'C'], 0, 3)).toBeNull()
	})

	test('only returns items whose position changed', () => {
		// Moving index 3 to 1: [A, B, C, D] → [A, D, B, C]
		const updates = computeReorder(['A', 'B', 'C', 'D'], 3, 1)
		expect(updates).toEqual([
			{ id: 'D', position: 1 },
			{ id: 'B', position: 2 },
			{ id: 'C', position: 3 },
		])
	})

	test('move last to first', () => {
		const updates = computeReorder(['A', 'B', 'C', 'D'], 3, 0)
		expect(updates).toEqual([
			{ id: 'D', position: 0 },
			{ id: 'A', position: 1 },
			{ id: 'B', position: 2 },
			{ id: 'C', position: 3 },
		])
	})
})
