export async function action() {
	return new Response(JSON.stringify({ error: 'not implemented' }), {
		status: 501,
		headers: { 'Content-Type': 'application/json' },
	})
}
