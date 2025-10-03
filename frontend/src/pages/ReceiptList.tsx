import { useState, useEffect } from "react";
import { Link } from "react-router";
import { getAllReceipts, deleteReceipt } from "../utils/storage";
import type { Receipt } from "../types/receipt";
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
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-4xl mx-auto">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold">My Receipts</h1>
				</div>

				{receipts.length === 0 ? (
					<div className="bg-white shadow-lg rounded-lg p-12 text-center">
						<p className="text-gray-600 mb-4">No receipts yet</p>
						<Link
							to="/upload"
							className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700"
						>
							Upload Your First Receipt
						</Link>
					</div>
				) : (
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
						{receipts.map((receipt) => {
							const total = receipt.items.reduce(
								(sum, item) => sum + item.price,
								0,
							);
							const hasSplits = Object.keys(receipt.splits).length > 0;

							return (
								<div
									key={receipt.id}
									className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition"
								>
									<img
										src={receipt.image}
										alt="Receipt"
										className="w-full h-48 object-cover"
									/>
									<div className="p-4">
										<p className="text-sm text-gray-600 mb-2">
											{new Date(receipt.createdAt).toLocaleDateString()}
										</p>
										<p className="text-lg font-bold mb-1">
											${(total / 100).toFixed(2)}
										</p>
										<p className="text-sm text-gray-600 mb-3">
											{receipt.items.length} items
											{hasSplits && " • Split"}
										</p>

										<div className="flex gap-2">
											<Link
												to={`/split/${receipt.id}`}
												className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-center font-semibold hover:bg-blue-700"
											>
												{hasSplits ? "View" : "Split"}
											</Link>
											<button
												type="button"
												onClick={() => handleDelete(receipt.id)}
												className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
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
