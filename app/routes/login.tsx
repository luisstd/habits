import { useState } from 'react'
import { redirect } from 'react-router'
import { auth } from '~/.server/auth'
import { user } from '~/.server/db/auth-schema'
import { db } from '~/.server/db/index'
import { authClient } from '~/lib/auth.client'
import type { Route } from './+types/login'

export async function loader({ request }: Route.LoaderArgs) {
	const users = await db.select({ id: user.id }).from(user).limit(1)
	if (users.length === 0) throw redirect('/setup')
	const session = await auth.api.getSession({ headers: request.headers })
	if (session) throw redirect('/')
	return null
}

export default function Login() {
	const [error, setError] = useState<string | null>(null)

	async function handlePasskey() {
		setError(null)
		try {
			await authClient.signIn.passkey()
		} catch {
			setError('passkey authentication failed')
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-sm rounded-sm border border-border bg-card p-8">
				<h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
					habits
				</h1>
				<button
					type="button"
					onClick={handlePasskey}
					className="w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
				>
					sign in with passkey
				</button>
				{error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
			</div>
		</div>
	)
}
