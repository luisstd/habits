import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: ['./app/.server/db/auth-schema.ts', './app/.server/db/schema.ts'],
	out: './app/.server/db/migrations',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL! },
})
