import type { CSSProperties } from 'react'

type Props = {
	value: number
	colorVar: string
	height: number
	width?: number
	style?: CSSProperties
}

export const ConsistencyBar = ({ value, colorVar, height, width = 5, style }: Props) => {
	const clamped = Math.max(0, Math.min(1, value))

	return (
		<div
			aria-hidden
			style={{
				position: 'relative',
				width,
				height,
				borderRadius: 3,
				background: `color-mix(in oklch, ${colorVar} 14%, transparent)`,
				overflow: 'hidden',
				flex: '0 0 auto',
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					height: `${clamped * 100}%`,
					background: colorVar,
					borderRadius: 3,
					transition: 'height 300ms ease',
				}}
			/>
		</div>
	)
}
