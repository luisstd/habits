export default function Home() {
	return (
		<div className="mx-auto max-w-2xl">
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<th className="pb-3 pr-4 text-left text-sm font-medium text-muted-foreground" />
							{['m', 't', 'w', 'th', 'f', 's', 'su'].map((d) => (
								<th key={d} className="pb-3 text-center text-xs font-medium text-muted-foreground">
									<div className="mx-auto mb-1 h-3 w-6 rounded-sm bg-muted" />
									<div className="mx-auto h-4 w-4 rounded-sm bg-muted" />
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{['a', 'b', 'c', 'd', 'e'].map((row) => (
							<tr key={row} className="border-t border-border">
								<td className="py-3 pr-4">
									<div className="h-4 w-16 rounded-sm bg-muted sm:w-20" />
								</td>
								{['m', 't', 'w', 'th', 'f', 's', 'su'].map((col) => (
									<td key={col} className="py-3 text-center">
										<div className="mx-auto size-8 rounded-sm border border-dashed border-border sm:size-10" />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
