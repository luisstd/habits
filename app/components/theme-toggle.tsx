import { useFetcher } from 'react-router'
import { Button } from '~/components/ui/button'
import { useTheme } from '~/lib/theme'

export function ThemeToggle() {
	const theme = useTheme()
	const fetcher = useFetcher()
	const next = theme === 'dark' ? 'light' : 'dark'

	return (
		<fetcher.Form method="post" action="/set-theme">
			<input type="hidden" name="theme" value={next} />
			<Button variant="outline" size="sm" type="submit">
				{next}
			</Button>
		</fetcher.Form>
	)
}
