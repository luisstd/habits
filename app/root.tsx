import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useRouteLoaderData,
} from 'react-router'

import '@fontsource-variable/urbanist'
import './app.css'

import { type Theme, themeCookie } from '~/lib/theme'
import type { Route } from './+types/root'

export async function loader({ request }: Route.LoaderArgs) {
	const theme = ((await themeCookie.parse(request.headers.get('cookie'))) as Theme) ?? 'light'
	return { theme }
}

export function Layout({ children }: { children: React.ReactNode }) {
	const loaderData = useRouteLoaderData<typeof loader>('root')
	const theme = loaderData?.theme ?? 'light'

	return (
		<html lang="en" className={theme === 'dark' ? 'dark' : ''}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App() {
	const [queryClient] = useState(() => new QueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = 'oops!'
	let details = 'an unexpected error occurred.'

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'error'
		details =
			error.status === 404 ? 'the requested page could not be found.' : error.statusText || details
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message
	}

	return (
		<main className="container mx-auto p-4 pt-16">
			<h1>{message}</h1>
			<p>{details}</p>
		</main>
	)
}
