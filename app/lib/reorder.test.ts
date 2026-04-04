import { describe, expect, test } from 'vitest'
import { computeReorder } from './reorder'

describe('computeReorder', () => {
	test('move forward: A to C position', () => {
		const updates = computeReorder(['A', 'B', 'C', 'D'], 'A', 'C')
		expect(updates).toEqual([
			{ id: 'B', position: 0 },
			{ id: 'C', position: 1 },
			{ id: 'A', position: 2 },
		])
	})

	test('move backward: C to A position', () => {
		const updates = computeReorder(['A', 'B', 'C', 'D'], 'C', 'A')
		expect(updates).toEqual([
			{ id: 'C', position: 0 },
			{ id: 'A', position: 1 },
			{ id: 'B', position: 2 },
		])
	})

	test('adjacent swap', () => {
		const updates = computeReorder(['A', 'B', 'C'], 'A', 'B')
		expect(updates).toEqual([
			{ id: 'B', position: 0 },
			{ id: 'A', position: 1 },
		])
	})

	test('two-element swap', () => {
		const updates = computeReorder(['A', 'B'], 'A', 'B')
		expect(updates).toEqual([
			{ id: 'B', position: 0 },
			{ id: 'A', position: 1 },
		])
	})

	test('returns null when sourceId === targetId', () => {
		expect(computeReorder(['A', 'B', 'C'], 'A', 'A')).toBeNull()
	})

	test('returns null when sourceId not in array', () => {
		expect(computeReorder(['A', 'B', 'C'], 'X', 'A')).toBeNull()
	})

	test('returns null when targetId not in array', () => {
		expect(computeReorder(['A', 'B', 'C'], 'A', 'X')).toBeNull()
	})

	test('only returns items whose position changed', () => {
		// Moving D to B: [A, B, C, D] → [A, D, B, C]
		// A stays at 0, so not included
		const updates = computeReorder(['A', 'B', 'C', 'D'], 'D', 'B')
		expect(updates).toEqual([
			{ id: 'D', position: 1 },
			{ id: 'B', position: 2 },
			{ id: 'C', position: 3 },
		])
	})

	test('move last to first', () => {
		const updates = computeReorder(['A', 'B', 'C', 'D'], 'D', 'A')
		expect(updates).toEqual([
			{ id: 'D', position: 0 },
			{ id: 'A', position: 1 },
			{ id: 'B', position: 2 },
			{ id: 'C', position: 3 },
		])
	})
})
