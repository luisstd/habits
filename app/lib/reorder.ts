/**
 * Given an ordered array of IDs, compute a new ordering by moving the item
 * at fromIndex to toIndex. Returns position updates for changed items, or
 * null if the operation is a no-op.
 */
export function computeReorder(
	ids: string[],
	fromIndex: number,
	toIndex: number,
): { id: string; position: number }[] | null {
	if (fromIndex === toIndex) return null
	if (fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) return null

	const reordered = [...ids]
	reordered.splice(fromIndex, 1)
	reordered.splice(toIndex, 0, ids[fromIndex])

	const updates: { id: string; position: number }[] = []
	for (let i = 0; i < reordered.length; i++) {
		if (reordered[i] !== ids[i]) {
			updates.push({ id: reordered[i], position: i })
		}
	}

	return updates.length > 0 ? updates : null
}
