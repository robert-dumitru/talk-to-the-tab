export function Button({
	children,
	onClick,
}: {
	children: React.ReactNode;
	onClick?: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className="bg-slate-700 hover:bg-slate-600 hover:scale-102 text-white py-3 px-6 rounded-lg font-semibold transition transition-all"
		>
			{children}
		</button>
	);
}
