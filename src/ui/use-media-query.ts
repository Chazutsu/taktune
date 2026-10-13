import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(
		() => typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches),
	);
	useEffect(() => {
		if (!window.matchMedia) return;
		const media = window.matchMedia(query);
		const update = (): void => setMatches(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, [query]);
	return matches;
}
