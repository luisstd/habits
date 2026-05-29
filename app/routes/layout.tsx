import { Outlet, redirect, useLoaderData } from 'react-router'
import { getAuthState } from '~/.server/auth'
import { useForegroundAuthCheck } from '~/lib/use-foreground-auth-check'
import type { Route } from './+types/layout'

export const loader = async ({ request }: Route.LoaderArgs) => {
	const state = await getAuthState(request)
	if (state.status !== 'authenticated') throw redirect('/login')
	return { userId: state.userId }
}

export default function AppLayout() {
	const { userId } = useLoaderData<typeof loader>()
	useForegroundAuthCheck()

	return (
		<div className="min-h-screen">
			<main className="px-4 pb-4 sm:px-6 sm:pb-6">
				<Outlet context={{ userId }} />
			</main>
		</div>
	)
}
