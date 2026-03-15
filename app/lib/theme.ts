import { createCookie, useRouteLoaderData } from 'react-router'

export type Theme = 'light' | 'dark'

export const themeCookie = createCookie('theme', {
	maxAge: 60 * 60 * 24 * 365,
	path: '/',
	sameSite: 'lax',
})

export function useTheme(): Theme {
	const data = useRouteLoaderData<{ theme: Theme }>('root')
	return data?.theme ?? 'light'
}
