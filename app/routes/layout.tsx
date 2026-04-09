import { Outlet, redirect, useLoaderData } from 'react-router'
import { getAuthState } from '~/.server/auth'
import { ThemeToggle } from '~/components/theme-toggle'
import type { Route } from './+types/layout'

export const loader = async ({ request }: Route.LoaderArgs) => {
	const state = await getAuthState(request)
	if (state.status !== 'authenticated') throw redirect('/login')
	return { userId: state.userId }
}

export default function AppLayout() {
	const { userId } = useLoaderData<typeof loader>()

	return (
		<div className="min-h-screen">
			<header className="flex items-center justify-between border-b border-foreground px-4 sm:px-6 py-4">
				<h1 className="text-lg font-semibold tracking-tight">habits</h1>
				<ThemeToggle />
			</header>
			<main className="px-4 pt-3 pb-4 sm:p-6">
				<Outlet context={{ userId }} />
			</main>
		</div>
	)
}
