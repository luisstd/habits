import { useState } from 'react'
import { redirect, useLoaderData, useNavigate, useRevalidator } from 'react-router'
import { getAuthState } from '~/.server/auth'
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth.client'
import type { Route } from './+types/login'

export const meta: Route.MetaFunction = () => [{ title: 'sign in — habits' }]

export async function loader({ request }: Route.LoaderArgs) {
	const state = await getAuthState(request)
	if (state.status === 'authenticated') throw redirect('/')
	return { authState: state.status }
}

type FlowState = 'idle' | 'registering' | 'signing-in'

export default function Login() {
	const { authState } = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const revalidator = useRevalidator()
	const [flowState, setFlowState] = useState<FlowState>('idle')
	const [error, setError] = useState<string | null>(null)

	const needsPasskey = authState === 'needs-passkey'
	const busy = flowState !== 'idle'
	const registerLabel =
		flowState === 'registering' ? "follow your browser's passkey prompt..." : 'create account'
	const signInLabel = flowState === 'signing-in' ? 'authenticating...' : 'sign in with passkey'
	const addPasskeyLabel =
		flowState === 'registering' ? "follow your browser's passkey prompt..." : 'add passkey'

	async function handleRegister() {
		setFlowState('registering')
		setError(null)
		try {
			await authClient.signIn.anonymous()
			await authClient.passkey.addPasskey()
			revalidator.revalidate()
			navigate('/')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'registration failed')
			setFlowState('idle')
		}
	}

	async function handleCompleteRegistration() {
		setFlowState('registering')
		setError(null)
		try {
			await authClient.passkey.addPasskey()
			revalidator.revalidate()
			navigate('/')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'registration failed')
			setFlowState('idle')
		}
	}

	async function handleSignIn() {
		setFlowState('signing-in')
		setError(null)
		try {
			await authClient.signIn.passkey()
			revalidator.revalidate()
			navigate('/')
		} catch {
			setError('passkey authentication failed')
			setFlowState('idle')
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-sm rounded-xl border border-foreground bg-card p-8 shadow-brutal-hover">
				<h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground">
					habits
				</h1>
				<p className="mb-6 text-center text-sm text-muted-foreground">
					{needsPasskey
						? 'complete your registration by adding a passkey'
						: 'sign in or create an account to get started'}
				</p>

				{needsPasskey ? (
					<Button className="w-full" onClick={handleCompleteRegistration} disabled={busy}>
						{addPasskeyLabel}
					</Button>
				) : (
					<div className="flex flex-col gap-3">
						<Button className="w-full" onClick={handleSignIn} disabled={busy}>
							{signInLabel}
						</Button>
						<Button className="w-full" variant="outline" onClick={handleRegister} disabled={busy}>
							{registerLabel}
						</Button>
					</div>
				)}

				{error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
			</div>
		</div>
	)
}
