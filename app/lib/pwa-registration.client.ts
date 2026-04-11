import { registerSW as register } from 'virtual:pwa-register'

export function registerSW() {
	register({
		immediate: true,
		onRegisteredSW(_swUrl, registration) {
			if (registration) {
				setInterval(
					() => {
						registration.update()
					},
					60 * 60 * 1000,
				)
			}
		},
	})
}
