import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import * as authSchema from './db/auth-schema'
import { db } from './db/index'

export const auth = betterAuth({
	baseURL: process.env.AUTH_ORIGIN ?? 'http://localhost:5173',
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: authSchema,
	}),
	plugins: [
		anonymous(),
		passkey({
			rpID: process.env.RP_ID ?? 'localhost',
			rpName: 'habits',
			origin: process.env.AUTH_ORIGIN ?? 'http://localhost:5173',
		}),
	],
	emailAndPassword: { enabled: false },
})
