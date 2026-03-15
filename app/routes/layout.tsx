import { Outlet, redirect } from 'react-router'
import { auth } from '~/.server/auth'
import { ThemeToggle } from '~/components/theme-toggle'
import type { Route } from './+types/layout'

export async function loader({ request }: Route.LoaderArgs) {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) throw redirect('/login')
	return null
}

export default function AppLayout() {
	return (
		<div className="min-h-screen">
			<header className="flex items-center justify-between border-b border-border px-6 py-4">
				<h1 className="text-lg font-semibold tracking-tight">habits</h1>
				<ThemeToggle />
			</header>
			<main className="p-6">
				<Outlet />
			</main>
		</div>
	)
}
