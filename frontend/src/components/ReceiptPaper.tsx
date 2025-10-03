import type { Receipt, ReceiptItem } from "@/types/receipt";

interface ReceiptPaperProps {
	receipt: Receipt;
}

export default function ReceiptPaper({ receipt }: ReceiptPaperProps) {
	const getItemTotal = (item: ReceiptItem) => {
		return (item.price / 100).toFixed(2);
	};

	const getSubtotal = () => {
		return receipt.items.reduce((sum, item) => sum + item.price, 0);
	};

	const getGrandTotal = () => {
		return getSubtotal() + receipt.tax + receipt.tip;
	};

	return (
		<div className="max-w-md mx-auto bg-white shadow-lg p-6 font-mono text-sm h-fit">
			<div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
				<h2 className="text-center text-lg font-bold">RECEIPT</h2>
				<p className="text-center text-xs text-gray-600">
					{new Date(receipt.createdAt).toLocaleDateString()}
				</p>
			</div>

			<div className="space-y-2 mb-4">
				{receipt.items.map((item) => {
					return (
						<div key={item.id} className="border-b border-gray-200 pb-2">
							<div className="flex justify-between">
								<span>{item.name}</span>
								<span>${getItemTotal(item)}</span>
							</div>
						</div>
					);
				})}
			</div>

			<div className="border-t-2 border-gray-400 pt-3 mt-4">
				<div className="flex justify-between">
					<span>SUBTOTAL</span>
					<span>${(getSubtotal() / 100).toFixed(2)}</span>
				</div>
				<div className="flex justify-between mt-1">
					<span>TAX</span>
					<span>${(receipt.tax / 100).toFixed(2)}</span>
				</div>
				<div className="flex justify-between mt-1">
					<span>TIP</span>
					<span>${(receipt.tip / 100).toFixed(2)}</span>
				</div>
			</div>

			<div className="border-t-2 border-double border-gray-600 pt-3 mt-3">
				<div className="flex justify-between font-bold text-base">
					<span>TOTAL</span>
					<span>${(getGrandTotal() / 100).toFixed(2)}</span>
				</div>
			</div>
		</div>
	);
}
