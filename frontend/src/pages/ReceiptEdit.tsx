import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import type { Receipt, ReceiptItem } from "@/types/receipt";
import { saveReceipt } from "@/utils/storage";
import ReceiptPaper from "@/components/ReceiptPaper";

export default function ReceiptEdit() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [image, setImage] = useState<string | null>(null);
	const [items, setItems] = useState<ReceiptItem[]>([]);
	const [tax, setTax] = useState<number>(0);
	const [tip, setTip] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadImage = () => {
			const storedImage = sessionStorage.getItem(`receipt_image_${id}`);
			if (storedImage) {
				setImage(storedImage);
				processImage(storedImage);
			} else {
				setError("No image found");
				setLoading(false);
			}
		};

		loadImage();
	}, [id]);

	const processImage = async (imageData: string) => {
		try {
			setLoading(true);

			// Call backend OCR endpoint
			const response = await fetch("http://localhost:8000/ai/ocr", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ image: imageData }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.detail || "OCR processing failed");
			}

			const data = await response.json();
			setItems(data.items);
			setTax(data.tax || 0);
			setTip(data.tip || 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to process image");
		} finally {
			setLoading(false);
		}
	};

	const updateItem = (id: string, field: keyof ReceiptItem, value: unknown) => {
		setItems((prev) =>
			prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
		);
	};

	const deleteItem = (id: string) => {
		setItems((prev) => prev.filter((item) => item.id !== id));
	};

	const addItem = () => {
		const newItem: ReceiptItem = {
			id: Math.random().toString(36).substring(7),
			name: "",
			price: 0,
			taxed: false,
		};
		setItems((prev) => [...prev, newItem]);
	};

	const handleContinue = () => {
		if (!image || !id) return;

		const receipt: Receipt = {
			id,
			image,
			items,
			tax,
			tip,
			splits: {},
			createdAt: Date.now(),
		};

		saveReceipt(receipt);
		sessionStorage.removeItem(`receipt_image_${id}`);
		navigate(`/split/${id}`);
	};

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
				<div className="text-red-600 text-center">
					<p className="text-xl font-bold">Error</p>
					<p>{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold mb-6 text-center">Edit Receipt</h1>

				<div className="grid md:grid-cols-2 gap-6">
					{/* Image preview */}
					<div className="bg-white shadow-lg rounded-lg p-4 h-fit sticky top-4">
						{image && (
							<img src={image} alt="Receipt" className="w-full rounded-lg" />
						)}
					</div>

					{/* Items editor */}
					<ReceiptPaper
						receipt={{
							id: id || "",
							image: image || "",
							items,
							tax,
							tip,
							splits: {},
							createdAt: Date.now(),
						}}
					/>
				</div>
			</div>
		</div>
	);
}
