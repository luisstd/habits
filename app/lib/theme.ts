import { useEffect, useState } from 'react'
import { createCookie, useRouteLoaderData } from 'react-router'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_COOKIE_NAME = 'theme'

export const themeCookie = createCookie(THEME_COOKIE_NAME, {
	maxAge: 60 * 60 * 24 * 365,
	path: '/',
	sameSite: 'lax',
})

export function isThemePreference(value: FormDataEntryValue | null): value is ThemePreference {
	return value === 'light' || value === 'dark' || value === 'system'
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
	if (preference === 'system') {
		return prefersDark ? 'dark' : 'light'
	}

	return preference
}

export function getThemeScript(preference: ThemePreference) {
	return `(() => {
		const preference = ${JSON.stringify(preference)};
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const resolvedTheme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
		const root = document.documentElement;
		root.classList.toggle('dark', resolvedTheme === 'dark');
		root.style.colorScheme = resolvedTheme;
		root.dataset.theme = preference;
	})();`
}

type RootThemeData = {
	themePreference: ThemePreference
}

export function useTheme() {
	const data = useRouteLoaderData<RootThemeData>('root')
	const themePreference = data?.themePreference ?? 'system'
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
		if (typeof document === 'undefined') return 'light'
		return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
	})

	useEffect(() => {
		if (typeof window === 'undefined') return

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

		const applyTheme = (prefersDark: boolean) => {
			const nextResolvedTheme = resolveTheme(themePreference, prefersDark)
			document.documentElement.classList.toggle('dark', nextResolvedTheme === 'dark')
			document.documentElement.style.colorScheme = nextResolvedTheme
			document.documentElement.dataset.theme = themePreference
			setResolvedTheme(nextResolvedTheme)
		}

		applyTheme(mediaQuery.matches)

		if (themePreference !== 'system') return

		const listener = (event: MediaQueryListEvent) => applyTheme(event.matches)
		mediaQuery.addEventListener('change', listener)

		return () => mediaQuery.removeEventListener('change', listener)
	}, [themePreference])

	return {
		themePreference,
		resolvedTheme,
	}
}
