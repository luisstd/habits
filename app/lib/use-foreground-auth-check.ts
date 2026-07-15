import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

const DEBOUNCE_MS = 30_000

export function useForegroundAuthCheck() {
	const navigate = useNavigate()
	const lastCheckRef = useRef(0)

	useEffect(() => {
		const checkAuth = async ({ force = false } = {}) => {
			const now = Date.now()
			if (!force && now - lastCheckRef.current < DEBOUNCE_MS) return

			lastCheckRef.current = now
			try {
				const { authClient } = await import('~/lib/auth.client')
				const { data: session, error } = await authClient.getSession()
				// A network failure (e.g. offline) is reported via `error`
				// rather than a thrown exception — only a clean "no session"
				// response means the user is actually logged out.
				if (!session && !error) {
					navigate('/login')
				}
			} catch {
				// Network error during auth check — ignore silently.
				// ElectricSQL will surface the problem via sync:auth-expired
				// if the session is actually gone.
			}
		}

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				void checkAuth()
			}
		}

		// The sync layer only dispatches this on a real 401, and by then the
		// shape stream has already stopped — debouncing here would leave the
		// user on a dead-sync dashboard with no redirect.
		const onAuthExpired = () => {
			void checkAuth({ force: true })
		}

		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('sync:auth-expired', onAuthExpired)

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('sync:auth-expired', onAuthExpired)
		}
	}, [navigate])
}
