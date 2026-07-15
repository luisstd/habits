import { FetchError } from '@electric-sql/client'
import {
	BrowserCollectionCoordinator,
	createBrowserWASQLitePersistence,
	openBrowserWASQLiteOPFSDatabase,
	persistedCollectionOptions,
} from '@tanstack/browser-db-sqlite-persistence'
import type { CollectionConfig } from '@tanstack/db'
import { createCollection } from '@tanstack/db'
import type { ElectricCollectionUtils } from '@tanstack/electric-db-collection'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { z } from 'zod'
import type { MutationPayload, MutationType } from '~/lib/schemas'

const habitSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	name: z.string(),
	color: z.string(),
	archived: z.boolean(),
	position: z.number(),
	created_at: z.date(),
})

const completionSchema = z.object({
	id: z.string(),
	habit_id: z.string(),
	user_id: z.string(),
	date: z.string(),
	created_at: z.date(),
})

type HabitRow = z.infer<typeof habitSchema>
type CompletionRow = z.infer<typeof completionSchema>
type CollectionKey = string | number
type HabitCollectionConfig = CollectionConfig<
	HabitRow,
	CollectionKey,
	typeof habitSchema,
	ElectricCollectionUtils<HabitRow>
> & { schema: typeof habitSchema }
type CompletionCollectionConfig = CollectionConfig<
	CompletionRow,
	CollectionKey,
	typeof completionSchema,
	ElectricCollectionUtils<CompletionRow>
> & { schema: typeof completionSchema }

function requireSchema<TConfig extends { schema?: unknown }>(config: TConfig) {
	// TanStack's persistedCollectionOptions currently widens schema to optional,
	// but createCollection's schema-aware overload requires it to be present.
	return config as TConfig & { schema: Exclude<TConfig['schema'], undefined> }
}

function dispatchAuthExpired() {
	window.dispatchEvent(new CustomEvent('sync:auth-expired'))
}

const HTTP_RETRY_DELAYS = [1000, 2000, 4000]
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])
const NETWORK_RETRY_BASE_DELAY_MS = 1000
const NETWORK_RETRY_MAX_DELAY_MS = 10_000
const ONLINE_RECHECK_INTERVAL_MS = 10_000

// How long a mutation waits for its transaction to appear in the shape
// stream before rolling back. Must cover the stream's own reconnect backoff
// after connectivity returns, or a write queued offline would be rolled back
// even though the server committed it.
const TXID_CONFIRMATION_TIMEOUT_MS = 60_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const onceOnline = () =>
	new Promise<void>((resolve) => {
		window.addEventListener('online', () => resolve(), { once: true })
	})

// `navigator.onLine === false` is trustworthy (we are definitely offline),
// but the `online` event is not guaranteed to fire in every environment, and
// on iOS PWAs background timers freeze — the app becoming visible again is
// the most reliable resume signal there. So every wait is cut short by
// either event, with the timer as fallback.
const waitBeforeNetworkRetry = (attempt: number) => {
	const delay = navigator.onLine
		? Math.min(NETWORK_RETRY_BASE_DELAY_MS * 2 ** attempt, NETWORK_RETRY_MAX_DELAY_MS)
		: ONLINE_RECHECK_INTERVAL_MS
	return new Promise<void>((resolve) => {
		const controller = new AbortController()
		const wake = () => {
			controller.abort()
			clearTimeout(timer)
			resolve()
		}
		const timer = setTimeout(wake, delay)
		window.addEventListener('online', wake, { signal: controller.signal })
		document.addEventListener(
			'visibilitychange',
			() => {
				if (document.visibilityState === 'visible') wake()
			},
			{ signal: controller.signal },
		)
	})
}

const syncMutation = async <T extends MutationType>(
	type: T,
	data: MutationPayload[T],
): Promise<{ txid: number; noop?: boolean }> => {
	let httpAttempt = 0
	let networkAttempt = 0
	while (true) {
		try {
			const res = await fetch('/api/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, data }),
			})
			if (res.ok) return res.json()

			if (res.status === 401) {
				dispatchAuthExpired()
				throw new Error('Session expired')
			}
			if (httpAttempt < HTTP_RETRY_DELAYS.length && RETRYABLE_STATUSES.has(res.status)) {
				await sleep(HTTP_RETRY_DELAYS[httpAttempt])
				httpAttempt++
				continue
			}
			const body = await res.json().catch(() => ({}))
			throw new Error(body.error ?? `Sync failed: ${res.status}`)
		} catch (e) {
			// A network failure (offline, server unreachable) must not reject:
			// TanStack DB keeps the optimistic state applied only while this
			// promise is pending, so rejecting would visibly roll back the
			// user's change. Retry until connectivity returns instead.
			if (e instanceof TypeError) {
				await waitBeforeNetworkRetry(networkAttempt)
				networkAttempt++
				continue
			}
			throw e
		}
	}
}

// The Electric client's default is to retry network errors internally
// forever, which keeps the collection in `loading` (and the UI on skeleton
// screens) when the app cold-starts offline — the persisted rows are only
// rendered once the collection is marked ready, and that happens when the
// first shape response *or error* surfaces. Fail fast here instead;
// recoverShapeStream then owns retrying at the stream level.
const SHAPE_BACKOFF_OPTIONS = {
	initialDelay: 1000,
	maxDelay: 32_000,
	multiplier: 2,
	maxRetries: 1,
}

// The Electric client tears the stream down for good after 50 consecutive
// onError-requested retries (any successful response resets the counter).
// These delays pace our retries so that budget spans a long outage.
const STREAM_OFFLINE_RECHECK_INTERVAL_MS = 5 * 60_000
const STREAM_ONLINE_RETRY_HOLD_MS = 30_000

// 401 means the session is gone: stop the stream and hand over to the auth
// flow. Anything else is treated as transient — returning an object asks the
// stream to retry, resuming from the persisted offset.
const recoverShapeStream = async (error: Error) => {
	if (error instanceof FetchError && error.status === 401) {
		dispatchAuthExpired()
		return
	}
	if (!navigator.onLine) {
		await Promise.race([onceOnline(), sleep(STREAM_OFFLINE_RECHECK_INTERVAL_MS)])
	} else {
		await sleep(STREAM_ONLINE_RETRY_HOLD_MS)
	}
	return {}
}

export const createHabit = (data: MutationPayload['createHabit']) =>
	syncMutation('createHabit', data)

export const updateHabit = (data: MutationPayload['updateHabit']) =>
	syncMutation('updateHabit', data)

export const deleteHabit = (data: MutationPayload['deleteHabit']) =>
	syncMutation('deleteHabit', data)

export const upsertCompletion = (data: MutationPayload['upsertCompletion']) =>
	syncMutation('upsertCompletion', data)

export const deleteCompletion = (data: MutationPayload['deleteCompletion']) =>
	syncMutation('deleteCompletion', data)

export type HabitCollection = Awaited<ReturnType<typeof createHabitCollections>>['habitCollection']
export type CompletionCollection = Awaited<
	ReturnType<typeof createHabitCollections>
>['completionCollection']

// The database used to be a single `habits.sqlite` shared by every account
// on the browser — remove it so a sign-in by a different account can't be
// shown another user's rows.
const removeLegacySharedDatabase = async () => {
	try {
		const root = await navigator.storage.getDirectory()
		await root.removeEntry('habits.sqlite')
	} catch {
		// Already gone (the usual case) — ignore.
	}
}

export const createHabitCollections = async (baseUrl: string, userId: string) => {
	void removeLegacySharedDatabase()

	// Keyed by user so an account switch never surfaces another user's
	// persisted rows, even when offline.
	const db = await openBrowserWASQLiteOPFSDatabase({ databaseName: `habits-${userId}.sqlite` })
	const coordinator = new BrowserCollectionCoordinator({ dbName: `habits-${userId}` })

	const persistence = createBrowserWASQLitePersistence({
		database: db,
		coordinator,
	})

	const habitCollectionOptions = requireSchema(
		persistedCollectionOptions({
			persistence,
			schemaVersion: 1,
			...electricCollectionOptions({
				id: 'habits',
				schema: habitSchema,
				getKey: (habit) => habit.id,
				shapeOptions: {
					url: `${baseUrl}/api/shapes/habits`,
					parser: {
						timestamptz: (value: string) => new Date(value),
					},
					backoffOptions: SHAPE_BACKOFF_OPTIONS,
					onError: recoverShapeStream,
				},
				onInsert: async ({ transaction }) => {
					const row = transaction.mutations[0].modified
					const { txid } = await createHabit(row)
					return { txid, timeout: TXID_CONFIRMATION_TIMEOUT_MS }
				},
				onUpdate: async ({ transaction }) => {
					const { original, changes } = transaction.mutations[0]
					const { txid } = await updateHabit({ id: original.id, ...changes })
					return { txid, timeout: TXID_CONFIRMATION_TIMEOUT_MS }
				},
				onDelete: async ({ transaction }) => {
					const row = transaction.mutations[0].original
					const { txid } = await deleteHabit(row)
					return { txid, timeout: TXID_CONFIRMATION_TIMEOUT_MS }
				},
			}),
		}),
	) satisfies HabitCollectionConfig

	const habitCollection = createCollection(habitCollectionOptions)

	const completionCollectionOptions = requireSchema(
		persistedCollectionOptions({
			persistence,
			schemaVersion: 1,
			...electricCollectionOptions({
				id: 'completions',
				schema: completionSchema,
				getKey: (completion) => completion.id,
				shapeOptions: {
					url: `${baseUrl}/api/shapes/completions`,
					parser: {
						timestamptz: (value: string) => new Date(value),
					},
					backoffOptions: SHAPE_BACKOFF_OPTIONS,
					onError: recoverShapeStream,
				},
				onInsert: async ({ transaction }) => {
					const row = transaction.mutations[0].modified
					const { txid } = await upsertCompletion(row)
					return { txid, timeout: TXID_CONFIRMATION_TIMEOUT_MS }
				},
				onDelete: async ({ transaction }) => {
					const row = transaction.mutations[0].original
					const { txid, noop } = await deleteCompletion(row)
					// A no-op delete's txid never appears in the shape stream —
					// don't wait for a confirmation that can't arrive.
					if (noop) return
					return { txid, timeout: TXID_CONFIRMATION_TIMEOUT_MS }
				},
			}),
		}),
	) satisfies CompletionCollectionConfig

	const completionCollection = createCollection(completionCollectionOptions)

	return {
		habitCollection,
		completionCollection,
		close: async () => {
			coordinator.dispose()
			await db.close?.()
		},
	}
}
