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
			<div className="w-full max-w-sm rounded-sm border border-border bg-card p-8">
				<h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground">
					habits
				</h1>
				<p className="mb-6 text-center text-sm text-muted-foreground">
					{needsPasskey
						? 'complete your registration by adding a passkey'
						: 'sign in or create an account to get started'}
				</p>

				{busy ? (
					<p className="text-center text-sm text-muted-foreground">
						{flowState === 'registering'
							? "follow your browser's passkey prompt..."
							: 'authenticating...'}
					</p>
				) : needsPasskey ? (
					<Button className="w-full" onClick={handleCompleteRegistration}>
						add passkey
					</Button>
				) : (
					<div className="flex flex-col gap-3">
						<Button className="w-full" onClick={handleSignIn}>
							sign in with passkey
						</Button>
						<Button className="w-full" variant="outline" onClick={handleRegister}>
							create account
						</Button>
					</div>
				)}

				{error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
			</div>
		</div>
	)
}
