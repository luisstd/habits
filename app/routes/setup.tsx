import { useState } from 'react'
import { redirect } from 'react-router'
import { user } from '~/.server/db/auth-schema'
import { db } from '~/.server/db/index'
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth.client'
import type { Route } from './+types/setup'

export const meta: Route.MetaFunction = () => [{ title: 'setup — habits' }]

export async function loader(_args: Route.LoaderArgs) {
	const users = await db.select({ id: user.id }).from(user).limit(1)
	if (users.length > 0) throw redirect('/login')
	return null
}

export default function Setup() {
	const [step, setStep] = useState<'start' | 'registering' | 'error'>('start')
	const [error, setError] = useState<string | null>(null)

	async function handleSetup() {
		setStep('registering')
		setError(null)
		try {
			await authClient.signIn.anonymous()
			await authClient.passkey.addPasskey()
			window.location.href = '/'
		} catch (err) {
			setStep('error')
			setError(err instanceof Error ? err.message : 'setup failed')
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-sm rounded-sm border border-border bg-card p-8">
				<h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground">
					habits
				</h1>
				<p className="mb-6 text-center text-sm text-muted-foreground">
					set up your passkey to get started
				</p>
				{step === 'start' && (
					<Button className="w-full" onClick={handleSetup}>
						register passkey
					</Button>
				)}
				{step === 'registering' && (
					<p className="text-center text-sm text-muted-foreground">
						follow your browser's passkey prompt...
					</p>
				)}
				{step === 'error' && (
					<>
						<p className="mb-4 text-center text-sm text-destructive">{error}</p>
						<Button className="w-full" onClick={() => setStep('start')}>
							try again
						</Button>
					</>
				)}
			</div>
		</div>
	)
}
