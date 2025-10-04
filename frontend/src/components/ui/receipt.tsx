import type { Receipt, ReceiptItem } from "@/types/receipt";

interface ReceiptProps {
	receipt: Receipt;
}

function ReceiptRow({ item }: { item: ReceiptItem }) {
    return (
        <div className="flex justify-between">
            <span>{item.name}</span>
            <span>${(item.price / 100).toFixed(2)}</span>
        </div>
    );
}

export function Receipt({ receipt }: ReceiptProps) {
	const getSubtotal = (receipt: Receipt) => {
		return receipt.items.reduce((sum, item) => sum + item.price, 0);
	};

	const getGrandTotal = (receipt: Receipt) => {
		return getSubtotal(receipt) + receipt.tax + receipt.tip;
	};

	return (
		<div className="max-w-md mx-auto bg-white shadow-lg p-6 font-mono text-sm h-fit">
			<div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
				<h2 className="text-center text-lg font-bold">RECEIPT</h2>
			</div>

			<div className="space-y-2">
				{receipt.items.map((item) => {
                    return (
					<ReceiptRow key={item.id} item={item} />
                    );
				})}
			</div>

			<div className="border-t-2 border-gray-400 pt-3 mt-4">
				<div className="flex justify-between">
					<span>SUBTOTAL</span>
					<span>${(getSubtotal(receipt) / 100).toFixed(2)}</span>
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
					<span>${(getGrandTotal(receipt) / 100).toFixed(2)}</span>
				</div>
			</div>
		</div>
	);
}
