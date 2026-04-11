import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

type Next = () => void

export default defineConfig({
	optimizeDeps: {
		exclude: [
			'@tanstack/db',
			'@tanstack/browser-db-sqlite-persistence',
			'@tanstack/db-sqlite-persistence-core',
			'@journeyapps/wa-sqlite',
		],
	},
	plugins: [
		{
			name: 'serve-wasm-files',
			configureServer(server) {
				server.middlewares.stack.unshift({
					route: '',
					handle: (req: IncomingMessage, res: ServerResponse, next: Next) => {
						const url = (req.url ?? '').split('?')[0]
						if (!url.endsWith('.wasm')) return next()

						const filePath = url.startsWith('/@fs') ? url.slice('/@fs'.length) : undefined
						if (!filePath || !fs.existsSync(filePath)) return next()

						const content = fs.readFileSync(filePath)
						res.writeHead(200, {
							'Content-Type': 'application/wasm',
							'Content-Length': content.byteLength,
							'Cache-Control': 'no-cache',
						})
						res.end(content)
					},
				})
			},
		},
		tailwindcss(),
		reactRouter(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: false,
			manifest: {
				id: '/',
				name: 'habits',
				short_name: 'habits',
				description: 'track your daily habits',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				display_override: ['standalone'],
				orientation: 'portrait',
				theme_color: '#fafafa',
				background_color: '#fafafa',
				categories: ['lifestyle', 'productivity'],
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,wasm}'],
				navigateFallback: null,
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'html-cache',
							networkTimeoutSeconds: 3,
							plugins: [
								{
									cacheWillUpdate: async ({ response }) =>
										response.status === 200 ? response : null,
								},
							],
						},
					},
					{
						urlPattern: /\.woff2$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'font-cache',
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
						},
					},
				],
			},
		}),
		tsconfigPaths(),
	],
})
