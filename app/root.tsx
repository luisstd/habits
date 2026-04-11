import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useRouteLoaderData,
} from 'react-router'

import '@fontsource-variable/urbanist/index.css'
import './app.css'

import { getThemeScript, isThemePreference, type ThemePreference, themeCookie } from '~/lib/theme'
import type { Route } from './+types/root'

export const meta: Route.MetaFunction = () => [
	{ title: 'habits' },
	{ name: 'description', content: 'track your daily habits' },
	{ name: 'theme-color', content: '#fafafa' },
	{ property: 'og:title', content: 'habits' },
	{ property: 'og:description', content: 'track your daily habits' },
	{ property: 'og:type', content: 'website' },
]

export async function loader({ request }: Route.LoaderArgs) {
	const parsedTheme = await themeCookie.parse(request.headers.get('cookie'))
	const themePreference = isThemePreference(parsedTheme) ? parsedTheme : 'system'

	return { themePreference }
}

function ThemeScript({ themePreference }: { themePreference: ThemePreference }) {
	return <script suppressHydrationWarning>{getThemeScript(themePreference)}</script>
}

export function Layout({ children }: { children: React.ReactNode }) {
	const loaderData = useRouteLoaderData<typeof loader>('root')
	const themePreference = loaderData?.themePreference ?? 'system'

	return (
		<html lang="en" data-theme={themePreference} suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<link rel="icon" href="/favicon.ico" sizes="32x32" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<link rel="manifest" href="/manifest.webmanifest" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="mobile-web-app-capable" content="yes" />
				<ThemeScript themePreference={themePreference} />
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

	useEffect(() => {
		import('~/lib/pwa-registration.client').then((m) => m.registerSW())
	}, [])

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
