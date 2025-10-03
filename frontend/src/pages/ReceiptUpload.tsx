import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export default function ReceiptUpload() {
	const [image, setImage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const compressImage = (file: File): Promise<string> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (!ctx) return;

					// Max width/height to reduce file size
					const MAX_WIDTH = 800;
					const MAX_HEIGHT = 800;
					let width = img.width;
					let height = img.height;

					if (width > height) {
						if (width > MAX_WIDTH) {
							height *= MAX_WIDTH / width;
							width = MAX_WIDTH;
						}
					} else {
						if (height > MAX_HEIGHT) {
							width *= MAX_HEIGHT / height;
							height = MAX_HEIGHT;
						}
					}

					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);

					// Compress to JPEG with 0.7 quality
					resolve(canvas.toDataURL("image/jpeg", 0.7));
				};
				img.src = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		});
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const compressed = await compressImage(file);
		setImage(compressed);
	};

	const handleContinue = () => {
		if (!image) return;
		const receiptId = Date.now().toString();
		sessionStorage.setItem(`receipt_image_${receiptId}`, image);
		navigate(`/edit/${receiptId}`);
	};

	return (
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-md mx-auto mt-8">
				<h1 className="text-3xl font-bold mb-8 text-center">Upload Receipt</h1>

				{!image ? (
					<div className="bg-white shadow-lg rounded-lg p-8">
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							onChange={handleFileChange}
							className="hidden"
						/>
						<Button onClick={() => fileInputRef.current?.click()}>
							Take Photo / Upload
						</Button>

						<p className="text-center text-gray-600 mt-4 text-sm">
							Upload a photo of your receipt to get started
						</p>
					</div>
				) : (
					<div className="bg-white shadow-lg rounded-lg p-4">
						<img
							src={image}
							alt="Receipt preview"
							className="w-full rounded-lg mb-4"
						/>

						<div className="flex flex-row gap-3 w-full">
							<div className="flex-1" />
							<Button onClick={() => setImage(null)}>Retake</Button>
							<Button onClick={handleContinue}>Continue</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
