import type { Receipt, ReceiptItem, ItemSplit } from "@/types/receipt";
import { useCurrentReceipt } from "@/hooks/use-current-receipt";

interface ReceiptProps {
	receipt?: Receipt;
}

function ReceiptRow({ item, splits }: { item: ReceiptItem; splits: ItemSplit[] }) {
	const itemSplits = splits.filter((s) => s.itemId === item.id);

	return (
		<div>
			<div className="flex justify-between">
				<span>{item.name}</span>
				<span>${(item.price / 100).toFixed(2)}</span>
			</div>
			{itemSplits.length > 0 && (
				<div className="ml-4 text-xs text-gray-600 space-y-0.5">
					{itemSplits.map((split) => (
						<div key={split.id}>
							→ {split.person}:{" "}
							{split.type === "absolute"
								? `$${((split.amount || 0) / 100).toFixed(2)}`
								: `${split.shares}/${split.totalShares} shares`}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function Receipt({ receipt: receiptProp }: ReceiptProps) {
	const { receipt: currentReceipt, splitSummary } = useCurrentReceipt();
	const receipt = receiptProp ?? currentReceipt;

	if (!receipt) {
		return null;
	}

	const lineItems = receipt.items.filter(
		(item) => item.name !== "TAX" && item.name !== "TIP",
	);
	const subTotal = {
		id: "",
		name: "SUBTOTAL",
		price: lineItems.reduce((sum, item) => sum + item.price, 0),
		taxed: false
	};
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
	const grandTotal = subTotal.price + tax.price + tip.price;
	const splits = splitSummary?.splits || [];

	return (
		<div className="max-w-md mx-auto bg-white shadow-lg p-6 font-mono text-sm h-fit">
			<div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
				<h2 className="text-center text-lg font-bold">RECEIPT</h2>
			</div>

			<div className="space-y-2">
				{lineItems.map((item) => {
					return <ReceiptRow key={item.id} item={item} splits={splits} />;
				})}
			</div>

			<div className="border-t-2 border-gray-400 pt-3 mt-4 space-y-2">
				<ReceiptRow item={subTotal} splits={[]} />
				<ReceiptRow item={tip} splits={[]} />
				<ReceiptRow item={tax} splits={[]} />
			</div>

			<div className="border-t-2 border-double border-gray-600 pt-3 mt-3">
				<div className="flex justify-between font-bold text-base">
					<span>TOTAL</span>
					<span>${(grandTotal / 100).toFixed(2)}</span>
				</div>
			</div>

			{splitSummary && splitSummary.personTotals.length > 0 && (
				<div className="border-t-2 border-dashed border-gray-400 pt-3 mt-4">
					<h3 className="text-center font-bold mb-2">SPLIT SUMMARY</h3>
					<div className="space-y-2">
						{splitSummary.personTotals.map((personTotal) => (
							<div key={personTotal.person} className="text-xs">
								<div className="font-bold">{personTotal.person.toUpperCase()}</div>
								<div className="ml-2 space-y-0.5">
									<div className="flex justify-between">
										<span>Subtotal</span>
										<span>${(personTotal.subtotal / 100).toFixed(2)}</span>
									</div>
									<div className="flex justify-between">
										<span>Tax</span>
										<span>${(personTotal.tax / 100).toFixed(2)}</span>
									</div>
									<div className="flex justify-between">
										<span>Tip</span>
										<span>${(personTotal.tip / 100).toFixed(2)}</span>
									</div>
									<div className="flex justify-between font-bold">
										<span>Total</span>
										<span>${(personTotal.total / 100).toFixed(2)}</span>
									</div>
								</div>
							</div>
						))}
						{splitSummary.unsplitAmount > 0 && (
							<div className="border-t border-gray-300 pt-2 mt-2">
								<div className="flex justify-between font-bold text-xs">
									<span>UNSPLIT</span>
									<span>${(splitSummary.unsplitAmount / 100).toFixed(2)}</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
