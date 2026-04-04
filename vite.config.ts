import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
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
		tsconfigPaths(),
	],
})
