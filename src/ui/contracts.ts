export interface PersistedReviewFocus {
	date?: unknown;
	focusIds?: unknown;
	next?: unknown;
}

export function reviewFocusCandidates(value: unknown): string[] {
	const values = Array.isArray(value) ? value : String(value || "").split("\n");
	return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
}

export function reviewFocusItems(value: unknown): string[] {
	return reviewFocusCandidates(value).slice(0, 3);
}

export function appendReviewFocus(
	value: unknown,
	title: string,
	limit = 3,
): { added: boolean; value: string } {
	const items = reviewFocusCandidates(value);
	const normalized = title.trim();
	if (!normalized || items.includes(normalized) || items.length >= limit)
		return { added: false, value: items.join("\n") };
	return { added: true, value: [...items, normalized].join("\n") };
}

export interface PreviousReviewFocus {
	date: string;
	ids: Record<string, string>;
	items: string[];
}

export interface ReviewFocusProgressItem {
	action: "open" | "plan" | null;
	label: string;
	title: string;
}

type ContractTranslator = (
	key: string,
	values?: Record<string, unknown>,
	fallback?: string,
) => string;

function contractText(t: ContractTranslator | undefined, key: string, fallback: string): string {
	const translated = t?.(key, {}, fallback);
	return translated && translated !== key ? translated : fallback;
}

export interface ReviewFocusTaskState {
	doneDate?: string;
	id?: string;
	scheduled: boolean;
	title: string;
}

export function previousReviewFocus(
	lastReview: PersistedReviewFocus | null | undefined,
): PreviousReviewFocus | null {
	const items = Array.isArray(lastReview?.next) ? reviewFocusItems(lastReview.next) : [];
	const sourceIds =
		lastReview?.focusIds &&
		typeof lastReview.focusIds === "object" &&
		!Array.isArray(lastReview.focusIds)
			? (lastReview.focusIds as Record<string, unknown>)
			: {};
	const ids = Object.fromEntries(
		items.map((title) => [title, String(sourceIds[title] || "")]).filter(([, id]) => id),
	);
	return items.length ? { date: String(lastReview?.date || ""), ids, items } : null;
}

export function reviewFocusProgress(
	focus: PreviousReviewFocus | null,
	tasks: ReviewFocusTaskState[],
	t?: ContractTranslator,
): { date: string; items: ReviewFocusProgressItem[] } | null {
	if (!focus) return null;
	return {
		date: focus.date,
		items: focus.items.map((title) => {
			const focusId = focus.ids[title];
			const matches = focusId
				? tasks.filter((task) => task.id === focusId)
				: tasks.filter((task) => task.title === title);
			if (matches.some((task) => task.doneDate && task.doneDate >= focus.date))
				return {
					title,
					label: contractText(t, "review.focus.completed", "Completed"),
					action: null,
				};
			if (matches.some((task) => task.scheduled && !task.doneDate))
				return {
					title,
					label: contractText(t, "review.focus.scheduled", "Scheduled"),
					action: "open",
				};
			if (matches.some((task) => !task.doneDate))
				return {
					title,
					label: contractText(t, "review.focus.unscheduled", "Unscheduled"),
					action: "plan",
				};
			return {
				title,
				label: contractText(t, "review.focus.missing", "Not created"),
				action: "plan",
			};
		}),
	};
}
