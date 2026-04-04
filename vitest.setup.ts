import { Temporal } from '@js-temporal/polyfill'

// Polyfill Temporal for Node.js test environment
if (typeof globalThis.Temporal === 'undefined') {
	// @ts-expect-error -- polyfill assignment
	globalThis.Temporal = Temporal
}
