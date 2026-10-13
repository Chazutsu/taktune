import type { CSSProperties, DragEvent, ReactElement } from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface CalendarTaskRowModel {
	ariaLabel?: string;
	color?: string;
	context?: string;
	done?: boolean;
	dragPayload?: string | null;
	meta?: string;
	onOpen?: () => void;
	onToggle?: () => void | Promise<void>;
	plainTitle: string;
	repeat?: boolean;
	selected?: boolean;
	selectionMode?: boolean;
	title: HTMLElement;
}

export function CalendarTaskRow({
	model,
	compact = false,
	hideDetails = false,
}: {
	model: CalendarTaskRowModel;
	compact?: boolean;
	hideDetails?: boolean;
}): ReactElement {
	const t = useI18n();
	const drag = (event: DragEvent<HTMLElement>) => {
		if (!model.dragPayload) return;
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("application/x-ttd-task", model.dragPayload);
	};
	const toggleLabel = model.selectionMode
		? t(model.selected ? "planTray.deselect" : "planTray.select")
		: t(
				model.repeat
					? "calendarEntry.futureRepeat"
					: model.done
						? "calendarEntry.reopen"
						: "calendarEntry.complete",
			);
	return (
		<div
			data-calendar-task-row
			aria-label={model.ariaLabel}
			draggable={Boolean(model.dragPayload)}
			onDragStart={drag}
			style={{ "--entry-color": model.color || "var(--interactive-accent)" } as CSSProperties}
			className={`grid min-w-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-1.5 border-l-[3px] border-l-[var(--entry-color)] px-1.5 text-[11px] hover:bg-[var(--background-modifier-hover)] max-[620px]:min-h-11 max-[620px]:grid-cols-[44px_minmax(0,1fr)_auto] max-[720px]:min-h-11 max-[720px]:grid-cols-[44px_minmax(0,1fr)_auto] ${compact ? "min-h-8 py-0.5" : "min-h-10 py-1"} ${model.dragPayload ? "cursor-grab active:cursor-grabbing" : ""} ${model.repeat ? "border-dashed opacity-75" : ""} ${model.done ? "opacity-50" : ""} ${model.selected ? "bg-ttd-selected ring-1 ring-inset ring-[var(--entry-color)]" : ""}`}
		>
			<button
				type="button"
				disabled={model.repeat}
				aria-label={toggleLabel}
				onClick={() => void model.onToggle?.()}
				className="grid size-8 place-items-center rounded-full border-0 bg-transparent p-0 text-[var(--entry-color)] shadow-none max-[620px]:size-11 max-[720px]:size-11"
			>
				<Icon
					name={
						model.selectionMode
							? model.selected
								? "check-square"
								: "square"
							: model.repeat
								? "repeat-2"
								: model.done
									? "check"
									: "circle"
					}
					className="size-3.5"
				/>
			</button>
			<button
				type="button"
				aria-label={model.plainTitle}
				onClick={model.onOpen}
				className="grid min-h-8 min-w-0 gap-0.5 border-0 bg-transparent p-0 text-left text-[11px] shadow-none max-[620px]:min-h-11 max-[720px]:min-h-11"
			>
				<HtmlMount
					element={model.title}
					inline
					className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--text-normal)] [&_a]:text-inherit [&_a]:no-underline [&_p]:m-0 [&_p]:inline ${model.done ? "line-through" : ""}`}
				/>
				{hideDetails || (!model.meta && !model.context) ? null : (
					<span className="flex min-w-0 gap-1.5 overflow-hidden text-[10px] text-[var(--text-faint)]">
						{model.meta ? <span className="shrink-0 tabular-nums">{model.meta}</span> : null}
						{model.context ? (
							<span className="overflow-hidden text-ellipsis whitespace-nowrap">
								{model.context}
							</span>
						) : null}
					</span>
				)}
			</button>
			{model.dragPayload ? (
				<span
					aria-hidden="true"
					className="grid size-8 place-items-center text-[var(--text-faint)] max-[620px]:size-11"
				>
					<Icon name="grip-vertical" />
				</span>
			) : (
				<span />
			)}
		</div>
	);
}
