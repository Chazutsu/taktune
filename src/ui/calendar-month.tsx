import { useState, type CSSProperties, type DragEvent, type ReactElement } from "react";
import { HtmlMount } from "../design-system/html-mount";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

export interface CalendarMonthActivityEntry {
	achieved: boolean;
	icon: string;
	kind: "activity";
	title: string;
	type: string;
}

export interface CalendarMonthEventEntry {
	color: string;
	kind: "event";
	title: string;
	url: string;
}

export interface CalendarMonthTaskEntry {
	color: string;
	done: boolean;
	dragPayload: string | null;
	kind: "task";
	onOpen: () => void;
	repeat: boolean;
	time: string | null;
	title: HTMLElement;
}

export type CalendarMonthEntry =
	| CalendarMonthActivityEntry
	| CalendarMonthEventEntry
	| CalendarMonthTaskEntry;

export interface CalendarMonthCellModel {
	date: string;
	dayLabel: string;
	entries: CalendarMonthEntry[];
	onDrop: (payload: string) => void | Promise<void>;
	onOpenDay: () => void | Promise<void>;
	outside: boolean;
	today: boolean;
}

export interface CalendarMonthModel {
	cells: CalendarMonthCellModel[];
	multiweek: boolean;
}

function activityTone(type: string): string {
	if (type === "focus")
		return "border-l-[#8a6fd1] bg-[color-mix(in_srgb,#8a6fd1_14%,var(--background-primary))]";
	if (type === "countdown")
		return "border-l-[#e58b3e] bg-[color-mix(in_srgb,#e58b3e_14%,var(--background-primary))]";
	return "border-l-[#d49735] bg-[color-mix(in_srgb,#d49735_14%,var(--background-primary))]";
}

function MonthEntry({ entry }: { entry: CalendarMonthEntry }): ReactElement {
	const t = useI18n();
	const base =
		"mt-0.5 flex h-6 w-full min-w-0 items-center gap-1 overflow-hidden rounded-[3px] border-0 border-l-[3px] px-1.5 text-left text-[11px] leading-4 shadow-none";
	if (entry.kind === "activity")
		return (
			<div
				aria-label={t("calendarEntry.activity", { title: entry.title })}
				className={`${base} ${activityTone(entry.type)} ${entry.achieved ? "ring-1 ring-current" : ""}`}
			>
				<Icon name={entry.icon} className="size-2.5 shrink-0" />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{entry.title}</span>
			</div>
		);
	if (entry.kind === "event")
		return (
			<a
				href={entry.url}
				target="_blank"
				rel="noreferrer"
				aria-label={t("calendarEntry.event", { title: entry.title })}
				style={{ "--entry-color": entry.color } as CSSProperties}
				className={`${base} border-l-[var(--entry-color)] bg-[color-mix(in_srgb,var(--entry-color)_14%,var(--background-primary))] text-[var(--text-normal)] no-underline hover:text-[var(--text-normal)] hover:no-underline`}
			>
				<Icon name="calendar-days" className="size-2.5 shrink-0" />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{entry.title}</span>
			</a>
		);
	const startDrag = (event: DragEvent<HTMLElement>) => {
		if (!entry.dragPayload) return;
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("application/x-ttd-task", entry.dragPayload);
	};
	return (
		<button
			type="button"
			draggable={Boolean(entry.dragPayload)}
			onDragStart={startDrag}
			onClick={entry.onOpen}
			aria-label={t("calendarEntry.task", {
				title: entry.title.textContent || t("calendarEntry.untitled"),
			})}
			style={{ "--entry-color": entry.color } as CSSProperties}
			className={`${base} border-l-[var(--entry-color)] bg-[color-mix(in_srgb,var(--entry-color)_16%,var(--background-primary))] text-[var(--text-normal)] ${entry.dragPayload ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${entry.done ? "opacity-50 line-through" : ""} ${entry.repeat ? "border-dashed opacity-75" : ""}`}
		>
			{entry.time ? <span className="shrink-0 text-[var(--text-muted)]">{entry.time}</span> : null}
			{entry.repeat ? (
				<Icon name="repeat-2" className="size-2.5 shrink-0" />
			) : (
				<Icon name="circle-check" className="size-2.5 shrink-0" />
			)}
			<HtmlMount
				element={entry.title}
				inline
				className="min-w-0 overflow-hidden text-ellipsis [&_a]:text-inherit [&_a]:no-underline [&_p]:m-0 [&_p]:inline"
			/>
		</button>
	);
}

function MonthCell({ cell }: { cell: CalendarMonthCellModel }): ReactElement {
	const t = useI18n();
	const [dropTarget, setDropTarget] = useState(false);
	const dragOver = (event: DragEvent<HTMLElement>) => {
		if (!event.dataTransfer.types.includes("application/x-ttd-task")) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		setDropTarget(true);
	};
	const drop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setDropTarget(false);
		const payload = event.dataTransfer.getData("application/x-ttd-task");
		if (payload) void cell.onDrop(payload);
	};
	return (
		<section
			onDragOver={dragOver}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(false);
			}}
			onDrop={drop}
			aria-label={cell.date}
			className={`min-h-0 min-w-0 overflow-hidden border-b border-r border-[var(--background-modifier-border)] bg-[var(--background-primary)] p-1.5 max-[720px]:p-0.5 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0 ${cell.outside ? "bg-[var(--background-secondary-alt)] opacity-60" : ""} ${dropTarget ? "bg-[var(--background-modifier-active-hover)] shadow-[inset_0_0_0_2px_var(--interactive-accent)]" : ""}`}
		>
			<button
				type="button"
				onClick={() => void cell.onOpenDay()}
				aria-label={t("calendarEntry.openDay", { date: cell.date })}
				aria-current={cell.today ? "date" : undefined}
				className={`ml-auto grid size-8 place-items-center rounded-full border-0 bg-transparent p-0 text-[11px] text-[var(--text-muted)] shadow-none hover:bg-[var(--background-modifier-hover)] max-[720px]:mx-auto max-[720px]:size-11 max-[720px]:text-xs ${cell.today ? "!bg-[var(--interactive-accent)] !text-[var(--text-on-accent)] hover:!bg-[var(--interactive-accent)]" : ""}`}
			>
				{cell.dayLabel}
			</button>
			<div className="max-[720px]:hidden">
				{cell.entries.slice(0, 4).map((entry, index) => (
					<MonthEntry
						key={`${entry.kind}:${entry.title instanceof HTMLElement ? entry.title.textContent : entry.title}:${index}`}
						entry={entry}
					/>
				))}
				{cell.entries.length > 4 ? (
					<div className="mt-1 text-right text-[11px] text-[var(--text-faint)]">
						{t("calendarMonth.more", { count: cell.entries.length - 4 })}
					</div>
				) : null}
			</div>
			{cell.entries.length ? (
				<div
					aria-hidden="true"
					className="mt-0.5 hidden h-2 items-center justify-center gap-0.5 max-[720px]:flex"
				>
					{cell.entries.slice(0, 3).map((entry, index) => (
						<span
							key={`${entry.kind}:${index}`}
							className="size-1 rounded-full bg-[var(--text-muted)]"
						/>
					))}
				</div>
			) : null}
		</section>
	);
}

export function CalendarMonth({ model }: { model: CalendarMonthModel }): ReactElement {
	const t = useI18n();
	return (
		<div className="h-full min-h-[520px] min-w-0 overflow-x-hidden bg-[var(--background-primary)] max-[359px]:-mx-1 max-[359px]:w-[calc(100%+8px)] min-[721px]:min-h-0">
			<div className="grid h-full min-w-0 grid-rows-[30px_minmax(0,1fr)]">
				<div className="grid grid-cols-7 border-b border-[var(--background-modifier-border)] text-center text-[11px] text-[var(--text-faint)] [&>span]:pt-2 [&>span:nth-child(6)]:text-[#5f7fc8] [&>span:nth-child(7)]:text-[var(--color-red)]">
					{[1, 2, 3, 4, 5, 6, 0].map((day) => (
						<span key={day}>{t(`habitDialog.day.${day}`)}</span>
					))}
				</div>
				<div
					style={{ "--month-weeks": model.multiweek ? 4 : 6 } as CSSProperties}
					className="grid min-h-0 min-w-0 grid-cols-7 grid-rows-[repeat(var(--month-weeks),minmax(0,1fr))]"
				>
					{model.cells.map((cell) => (
						<MonthCell key={cell.date} cell={cell} />
					))}
				</div>
			</div>
		</div>
	);
}
