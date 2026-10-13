import { useLayoutEffect, useRef, type ReactElement } from "react";

export interface HtmlMountProps {
	className?: string;
	element: HTMLElement;
	inline?: boolean;
}

export function HtmlMount({
	className = "",
	element,
	inline = false,
}: HtmlMountProps): ReactElement {
	const ref = useRef<HTMLElement | null>(null);
	useLayoutEffect(() => {
		ref.current?.replaceChildren(element);
		return () => element.remove();
	}, [element]);
	const setRef = (node: HTMLElement | null) => {
		ref.current = node;
	};
	return inline ? (
		<span ref={setRef} className={className} />
	) : (
		<div ref={setRef} className={className} />
	);
}
