export function Button({
	children,
	onClick,
	disabled,
}: {
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className="bg-slate-700 hover:bg-slate-600 hover:scale-102 text-white py-3 px-6 rounded-lg font-semibold transition transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
		>
			{children}
		</button>
	);
}
