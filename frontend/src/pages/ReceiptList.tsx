import { useState, useEffect } from "react";
import { Link } from "react-router";
import { getAllReceipts, deleteReceipt } from "@/utils/storage";
import type { Receipt } from "@/types/receipt";
import { Container } from "@/components/ui/container";

export default function ReceiptList() {
	const [receipts, setReceipts] = useState<Receipt[]>([]);

	useEffect(() => {
		loadReceipts();
	}, []);

	const loadReceipts = () => {
		const allReceipts = getAllReceipts();
		// Sort by most recent first
		allReceipts.sort((a, b) => b.createdAt - a.createdAt);
		setReceipts(allReceipts);
	};

	const handleDelete = (id: string) => {
		if (confirm("Delete this receipt?")) {
			deleteReceipt(id);
			loadReceipts();
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 p-4">
			<div className="max-w-4xl mx-auto space-y-4">
				{receipts.length === 0 ? (
					<Container>
						<p className="text-slate-500 mb-4 font-light">No receipts yet</p>
						<Link
							to="/upload"
							className="inline-block px-6 py-3 text-sm font-light text-slate-900 border border-slate-300 rounded-sm hover:border-slate-400 transition-colors"
						>
							Upload Your First Receipt
						</Link>
					</Container>
				) : (
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{receipts.map((receipt) => {
							const total = receipt.items.reduce(
								(sum, item) => sum + item.price,
								0,
							);
							return (
								<div
									key={receipt.id}
									className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
								>
									<div className="p-4">
										<p className="text-xs text-slate-500 mb-2 font-light">
											{new Date(receipt.createdAt).toLocaleDateString()}
										</p>
										<p className="text-lg font-light text-slate-900 mb-1">
											${(total / 100).toFixed(2)}
										</p>
										<p className="text-sm text-slate-500 mb-4 font-light">
											{receipt.items.length} items
										</p>

										<div className="flex gap-2">
											<Link
												to={`/split/${receipt.id}`}
												className="flex-1 text-center py-2 px-3 text-sm font-light text-slate-900 border border-slate-300 rounded-sm hover:border-slate-400 transition-colors"
											></Link>
											<button
												type="button"
												onClick={() => handleDelete(receipt.id)}
												className="px-3 py-2 text-sm font-light text-slate-600 hover:text-slate-900 border border-slate-200 rounded-sm hover:border-slate-300 transition-colors"
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
