import type { ReactElement, ReactNode } from "react";

export function FocusedPage({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}): ReactElement {
	return (
		<div
			data-page-shell="focused"
			className={`grid w-full min-w-0 gap-3 pb-4 max-[620px]:gap-2.5 max-[620px]:pb-3 ${className}`.trim()}
		>
			{children}
		</div>
	);
}
