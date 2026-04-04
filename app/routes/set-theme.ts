import { data } from 'react-router'
import { isThemePreference, themeCookie } from '~/lib/theme'
import type { Route } from './+types/set-theme'

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const theme = formData.get('theme')
	if (!isThemePreference(theme)) {
		throw data({ error: 'invalid theme' }, { status: 400 })
	}

	return data(null, {
		headers: { 'Set-Cookie': await themeCookie.serialize(theme) },
	})
}
