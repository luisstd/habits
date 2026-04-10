import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

const DEBOUNCE_MS = 30_000

export function useForegroundAuthCheck() {
	const navigate = useNavigate()
	const lastCheckRef = useRef(0)

	useEffect(() => {
		const checkAuth = async () => {
			const now = Date.now()
			if (now - lastCheckRef.current < DEBOUNCE_MS) return

			lastCheckRef.current = now
			try {
				const { authClient } = await import('~/lib/auth.client')
				const { data: session } = await authClient.getSession()
				if (!session) {
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

		const onAuthExpired = () => {
			void checkAuth()
		}

		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('sync:auth-expired', onAuthExpired)

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('sync:auth-expired', onAuthExpired)
		}
	}, [navigate])
}
