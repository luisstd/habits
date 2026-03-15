import { data } from 'react-router'
import { type Theme, themeCookie } from '~/lib/theme'
import type { Route } from './+types/set-theme'

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const theme = formData.get('theme') as Theme
	return data(null, {
		headers: { 'Set-Cookie': await themeCookie.serialize(theme) },
	})
}
