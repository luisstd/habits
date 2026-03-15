import { useFetcher } from 'react-router'
import { useTheme } from '~/lib/theme'

export function ThemeToggle() {
	const theme = useTheme()
	const fetcher = useFetcher()
	const next = theme === 'dark' ? 'light' : 'dark'

	return (
		<fetcher.Form method="post" action="/set-theme">
			<input type="hidden" name="theme" value={next} />
			<button
				type="submit"
				className="rounded-sm border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
			>
				{next}
			</button>
		</fetcher.Form>
	)
}
