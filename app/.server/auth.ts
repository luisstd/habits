import { passkey as passkeyPlugin } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import * as authSchema from './db/auth-schema'
import { db } from './db/index'

export const auth = betterAuth({
	baseURL: process.env.AUTH_ORIGIN ?? 'http://localhost:5173',
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: authSchema,
	}),
	plugins: [
		anonymous({
			generateRandomEmail: async () => {
				const id = crypto.randomUUID().slice(0, 8)
				return `habits-${id}@habits.local`
			},
		}),
		passkeyPlugin({
			rpID: process.env.RP_ID ?? 'localhost',
			rpName: 'habits',
			origin: process.env.AUTH_ORIGIN ?? 'http://localhost:5173',
		}),
	],
	emailAndPassword: { enabled: false },
})

export type AuthState =
	| { status: 'unauthenticated' }
	| { status: 'needs-passkey'; userId: string }
	| { status: 'authenticated'; userId: string }

export async function getAuthState(request: Request): Promise<AuthState> {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session) return { status: 'unauthenticated' }
	const passkeys = await db
		.select({ id: authSchema.passkey.id })
		.from(authSchema.passkey)
		.where(eq(authSchema.passkey.userId, session.user.id))
		.limit(1)
	if (passkeys.length === 0) return { status: 'needs-passkey', userId: session.user.id }
	return { status: 'authenticated', userId: session.user.id }
}
