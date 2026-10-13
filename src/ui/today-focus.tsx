import type { ReactElement } from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";
import type { TaskListItem, TaskListModel } from "./task-list";

export interface TodayFocusModel {
	item: TaskListItem;
}

export function extractTodayFocus(model: TaskListModel): {
	focus: TodayFocusModel | null;
	remaining: TaskListModel;
} {
	for (let groupIndex = 0; groupIndex < model.groups.length; groupIndex += 1) {
		const group = model.groups[groupIndex];
		if (!group) continue;
		const itemIndex = group.items.findIndex(
			(item) => item.depth === 0 && !item.done && !item.wontDo && !item.disabled,
		);
		if (itemIndex < 0) continue;
		const item = group.items[itemIndex];
		if (!item) continue;
		let endIndex = itemIndex + 1;
		while (endIndex < group.items.length && (group.items[endIndex]?.depth ?? 0) > item.depth)
			endIndex += 1;
		const groups = model.groups
			.map((candidate, candidateIndex) =>
				candidateIndex === groupIndex
					? {
							...candidate,
							items: candidate.items.flatMap((candidateItem, index) => {
								if (index === itemIndex) return [];
								if (index > itemIndex && index < endIndex)
									return [{ ...candidateItem, depth: Math.max(0, candidateItem.depth - 1) }];
								return [candidateItem];
							}),
						}
					: candidate,
			)
			.filter((candidate) => candidate.items.length > 0);
		return { focus: { item }, remaining: { ...model, groups } };
	}
	return { focus: null, remaining: model };
}

export function TodayFocus({ model }: { model: TodayFocusModel }): ReactElement {
	const t = useI18n();
	const { item } = model;
	return (
		<section
			aria-labelledby="ttd-today-focus-title"
			className="mb-2 border-l-2 border-ttd-accent bg-ttd-accent-soft px-3 py-2.5"
		>
			<p
				id="ttd-today-focus-title"
				className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-ttd-accent"
			>
				{t("todayFocus.label")}
			</p>
			<div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
				<button
					type="button"
					onClick={item.onEdit}
					className="min-w-0 border-0 bg-transparent p-0 text-left shadow-none"
				>
					<HtmlMount element={item.title} className="text-sm font-semibold leading-5 [&_p]:m-0" />
					<div className="mt-0.5 flex min-w-0 flex-wrap gap-x-2 text-[11px] text-ttd-muted">
						{item.meta.slice(0, 3).map((meta, index) => (
							<span key={`${meta.label}-${index}`}>{meta.label}</span>
						))}
					</div>
				</button>
				<button
					type="button"
					aria-label={item.completeLabel}
					onClick={() => void item.onComplete()}
					className="grid size-11 place-items-center rounded-full border-[1.5px] border-ttd-accent bg-ttd-canvas p-0 text-ttd-accent shadow-none hover:bg-ttd-accent hover:text-ttd-on-accent"
				>
					<Icon name="check" />
				</button>
			</div>
		</section>
	);
}
