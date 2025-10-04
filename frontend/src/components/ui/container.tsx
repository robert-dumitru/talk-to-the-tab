export function Container({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-white rounded-sm shadow-sm border border-slate-200 p-8">
			{children}
		</div>
	);
}
