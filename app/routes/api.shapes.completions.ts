import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'
import { auth } from '~/.server/auth'
import type { Route } from './+types/api.shapes.completions'

const ELECTRIC_URL = process.env.ELECTRIC_URL ?? 'http://localhost:3000'

export const loader = async ({ request }: Route.LoaderArgs) => {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) {
		return new Response('Unauthorized', { status: 401 })
	}

	const url = new URL(request.url)
	const proxyUrl = new URL(`${ELECTRIC_URL}/v1/shape`)

	for (const param of ELECTRIC_PROTOCOL_QUERY_PARAMS) {
		const value = url.searchParams.get(param)
		if (value != null) {
			proxyUrl.searchParams.set(param, value)
		}
	}

	proxyUrl.searchParams.set('table', 'habit_completion')
	proxyUrl.searchParams.set('where', 'user_id = $1')
	proxyUrl.searchParams.set('params[1]', session.user.id)

	const response = await fetch(proxyUrl.toString())
	const headers = new Headers(response.headers)
	headers.delete('content-encoding')
	headers.delete('content-length')

	return new Response(response.body, {
		status: response.status,
		headers,
	})
}
