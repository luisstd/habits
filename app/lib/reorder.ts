/**
 * Given an ordered array of IDs, compute a new ordering by moving sourceId to targetId's position.
 * Returns position updates for changed items, or null if the operation is a no-op.
 */
export function computeReorder(
	ids: string[],
	sourceId: string,
	targetId: string,
): { id: string; position: number }[] | null {
	if (sourceId === targetId) return null

	const oldIndex = ids.indexOf(sourceId)
	const newIndex = ids.indexOf(targetId)
	if (oldIndex === -1 || newIndex === -1) return null

	const reordered = [...ids]
	reordered.splice(oldIndex, 1)
	reordered.splice(newIndex, 0, sourceId)

	const updates: { id: string; position: number }[] = []
	for (let i = 0; i < reordered.length; i++) {
		if (reordered[i] !== ids[i]) {
			updates.push({ id: reordered[i], position: i })
		}
	}

	return updates.length > 0 ? updates : null
}
