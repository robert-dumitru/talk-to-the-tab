export interface ReceiptItem {
	id: string;
	name: string;
	price: number;
	taxed: boolean;
}

export interface Receipt {
	id: string;
	items: ReceiptItem[];
	createdAt: number;
}

export interface ProportionalSplit {
	type: "proportional";
	user: string;
	shares: number;
	total: number;
}

export interface AbsoluteSplit {
	type: "absolute";
	user: string;
	amount: number;
}

export interface ItemSplit {
	id: string;
	itemId: string;
	person: string;
	type: "absolute" | "proportional";
	amount?: number; // For absolute splits (in cents)
	shares?: number; // For proportional splits
	totalShares?: number; // For proportional splits
}
