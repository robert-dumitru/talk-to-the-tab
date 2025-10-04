import { Link } from "react-router";
import { Container } from "@/components/ui/container";

export default function ReceiptList() {
	return (
		<div className="min-h-screen bg-slate-50 p-4">
			<Container>
				<Link
					to="/upload"
					className="inline-block px-6 py-3 text-sm font-light text-slate-900 border border-slate-300 rounded-sm hover:border-slate-400 transition-colors"
				>
					Upload Your Receipt
				</Link>
			</Container>
		</div>
	);
}
