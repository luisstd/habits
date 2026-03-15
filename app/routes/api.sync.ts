export async function action() {
	// write proxy: validates mutations with zod, forwards to postgres via drizzle
	// to be implemented when habit schemas are added
	return new Response(JSON.stringify({ error: 'not implemented' }), {
		status: 501,
		headers: { 'Content-Type': 'application/json' },
	})
}
