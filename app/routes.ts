import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'

export default [
	route('login', 'routes/login.tsx'),
	layout('routes/layout.tsx', [index('routes/dashboard.tsx')]),
	route('api/auth/*', 'routes/api.auth.$.ts'),
	route('api/health', 'routes/api.health.ts'),
	route('api/sync', 'routes/api.sync.ts'),
	route('api/shapes/habits', 'routes/api.shapes.habits.ts'),
	route('api/shapes/completions', 'routes/api.shapes.completions.ts'),
	route('set-theme', 'routes/set-theme.ts'),
] satisfies RouteConfig
