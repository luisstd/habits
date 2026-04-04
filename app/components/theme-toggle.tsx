import { LaptopMinimal, Moon, Sun } from 'lucide-react'
import { useFetcher } from 'react-router'
import { Button } from '~/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type { ThemePreference } from '~/lib/theme'
import { useTheme } from '~/lib/theme'

const themeOptions = [
	{ value: 'light', label: 'light', icon: Sun },
	{ value: 'dark', label: 'dark', icon: Moon },
	{ value: 'system', label: 'system', icon: LaptopMinimal },
] as const satisfies Array<{
	value: ThemePreference
	label: string
	icon: typeof Sun
}>

export function ThemeToggle() {
	const { themePreference, resolvedTheme } = useTheme()
	const fetcher = useFetcher()
	const pendingTheme = fetcher.formData?.get('theme')
	const pendingPreference =
		pendingTheme === 'light' || pendingTheme === 'dark' || pendingTheme === 'system'
			? pendingTheme
			: null
	const activePreference = pendingPreference ?? themePreference
	const pendingResolvedTheme =
		pendingPreference === 'light' || pendingPreference === 'dark'
			? pendingPreference
			: resolvedTheme
	const TriggerIcon = pendingResolvedTheme === 'dark' ? Moon : Sun

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="theme" />}>
				<TriggerIcon className="size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuGroup>
					<DropdownMenuLabel>appearance</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value={activePreference} aria-label="theme preference">
					{themeOptions.map((option) => {
						const Icon = option.icon

						return (
							<DropdownMenuRadioItem
								key={option.value}
								value={option.value}
								onClick={() =>
									fetcher.submit({ theme: option.value }, { method: 'post', action: '/set-theme' })
								}
								disabled={fetcher.state !== 'idle'}
							>
								<Icon className="size-4" />
								<span>{option.label}</span>
							</DropdownMenuRadioItem>
						)
					})}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
