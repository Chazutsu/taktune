import { setIcon } from "obsidian";
import { useEffect, useRef, type ReactElement } from "react";

export function Icon({
	name,
	className = "size-4",
}: {
	name: string;
	className?: string;
}): ReactElement {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) setIcon(ref.current, name);
	}, [name]);
	return (
		<span
			ref={ref}
			aria-hidden="true"
			className={`grid place-items-center [&>svg]:size-full ${className}`}
		/>
	);
}
