export interface ReceiptItem {
	id: string;
	name: string;
	price: number;
	taxed: boolean;
}

export interface Split {
	person: string;
	portion: number; // fraction of the item (1.0 = full item, 0.5 = half)
}

export interface Receipt {
	id: string;
	image: string; // base64 encoded image
	items: ReceiptItem[];
	tax: number; // tax amount in cents
	tip: number; // tip amount in cents
	splits: Record<string, Split[]>; // itemId -> list of splits
	createdAt: number;
}
