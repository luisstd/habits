import { Outlet, redirect, useLoaderData } from 'react-router'
import { auth } from '~/.server/auth'
import { ThemeToggle } from '~/components/theme-toggle'
import type { Route } from './+types/layout'

export const loader = async ({ request }: Route.LoaderArgs) => {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) throw redirect('/login')
	return { userId: session.user.id }
}

export default function AppLayout() {
	const { userId } = useLoaderData<typeof loader>()

	return (
		<div className="min-h-screen">
			<header className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-4">
				<h1 className="text-lg font-semibold tracking-tight">habits</h1>
				<ThemeToggle />
			</header>
			<main className="p-4 sm:p-6">
				<Outlet context={{ userId }} />
			</main>
		</div>
	)
}
