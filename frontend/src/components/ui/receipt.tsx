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
	const lineItems = receipt.items.filter(
		(item) => item.name !== "TAX" && item.name !== "TIP",
	);
	const subTotal = receipt.items.reduce((sum, item) => sum + item.price, 0);
	const tax = receipt.items.find((item) => item.name === "TAX") ?? {
		id: "",
		name: "TAX",
		price: 0,
		taxed: false,
	};
	const tip = receipt.items.find((item) => item.name === "TIP") ?? {
		id: "",
		name: "TIP",
		price: 0,
		taxed: false,
	};
	const grandTotal = subTotal + tax.price + tip.price;

	return (
		<div className="max-w-md mx-auto bg-white shadow-lg p-6 font-mono text-sm h-fit">
			<div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
				<h2 className="text-center text-lg font-bold">RECEIPT</h2>
			</div>

			<div className="space-y-2">
				{lineItems.map((item) => {
					return <ReceiptRow key={item.id} item={item} />;
				})}
			</div>

			<div className="border-t-2 border-gray-400 pt-3 mt-4 space-y-2">
				<div className="flex justify-between">
					<span>SUBTOTAL</span>
					<span>${(subTotal / 100).toFixed(2)}</span>
				</div>
				<ReceiptRow item={tip} />
				<ReceiptRow item={tax} />
			</div>

			<div className="border-t-2 border-double border-gray-600 pt-3 mt-3">
				<div className="flex justify-between font-bold text-base">
					<span>TOTAL</span>
					<span>${(grandTotal / 100).toFixed(2)}</span>
				</div>
			</div>
		</div>
	);
}
