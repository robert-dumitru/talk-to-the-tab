interface Window {
	google?: {
		accounts: {
			id: {
				initialize: (config: {
					client_id: string;
					callback: (response: { credential: string }) => void;
				}) => void;
				renderButton: (
					parent: HTMLElement,
					options: { theme?: string; size?: string; type?: string },
				) => void;
			};
		};
	};
}
